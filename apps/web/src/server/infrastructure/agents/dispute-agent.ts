import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import { createLogger, createSentryOptions, type UserId } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { BASE_PROMPT, buildSystemPrompt } from '@server/infrastructure/agents/build-system-prompt'
import { createDisputeAgentModel } from '@server/infrastructure/ai/model-factory'
import type { IAnalyticsService } from '@server/infrastructure/analytics/analytics-service'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import { DurableObjectOAuthClientProvider, type AgentMcpOAuthProvider } from 'agents'
import {
  convertToModelMessages,
  type StreamTextOnFinishCallback,
  tool,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { z } from 'zod'

/** Max chars returned per fetchUrl/readMore call. Guards the 256k Gemma context window. */
const FETCH_CHUNK_SIZE = 8000

/** Cache TTL for paged fetch documents in DO storage. Single onboarding session is < 60min. */
const FETCH_CACHE_TTL_MS = 60 * 60 * 1000

/** DO storage key prefix for paged fetch documents. Namespaced to avoid collision with MCP/auth keys. */
const FETCH_CACHE_PREFIX = '/fetch-cache/'

type CachedFetchDoc = {
  url: string
  title: string
  content: string
  expiresAt: number
}

/** Minimal escape for surfacing untrusted error text in the OAuth callback HTML response. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const logger = createLogger('dispute-agent')

/**
 * Runtime capability gate for the dispute agent. Drives tool selection and
 * system-prompt construction. NOT a mirror of product setup state — that lives
 * in Postgres; this is the derived flag, pushed in by domain event handlers on
 * setup-complete / setup-revert transitions.
 */
export type DisputeAgentMode = 'setup' | 'operate'

export type DisputeAgentState = {
  mode: DisputeAgentMode
}

/** Upgrade-time props forwarded from the auth-verified route — see `routes/api/agents/$.ts`. */
export type DisputeAgentProps = {
  userId: UserId
}

const USER_ID_STORAGE_KEY = 'userId'
const MCP_OAUTH_CLIENT_NAME = 'Riposte'

class RiposteMcpOAuthProvider extends DurableObjectOAuthClientProvider {
  get clientMetadata() {
    return {
      ...super.clientMetadata,
      client_name: MCP_OAUTH_CLIENT_NAME,
    }
  }
}

class DisputeAgent extends AIChatAgent<Env, DisputeAgentState, DisputeAgentProps> {
  private readonly deps: AppDeps
  private readonly analytics: IAnalyticsService

  initialState: DisputeAgentState = { mode: 'setup' }

  private userId?: UserId

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.deps = createAppDeps(env, state)
    this.analytics = this.deps.services.analytics()
  }

  createMcpOAuthProvider(callbackUrl: string): AgentMcpOAuthProvider {
    return new RiposteMcpOAuthProvider(this.ctx.storage, this.name, callbackUrl)
  }

  async onStart(props?: DisputeAgentProps): Promise<void> {
    if (props?.userId) {
      await this.ctx.storage.put(USER_ID_STORAGE_KEY, props.userId)
      this.userId = props.userId
    } else {
      this.userId = await this.ctx.storage.get<UserId>(USER_ID_STORAGE_KEY)
    }

    // TODO: consider where do we redirect currently?
    // export class MyAgent extends Agent<Env> {
    //   onStart() {
    //     this.mcp.configureOAuthCallback({
    //       successRedirect: "/dashboard",
    //       errorRedirect: "/auth-error",
    //     });
    //   }
    // }

    // After MCP OAuth completes, close the popup and inject a synthetic "connected"
    // user turn (same shape as `signalStripeConnected`) so the agent picks up the
    // new MCP tools on the next stream without the merchant typing anything.
    this.mcp.configureOAuthCallback({
      customHandler: (result) => {
        if (result.authSuccess) {
          const serverName =
            this.getMcpServers().servers[result.serverId]?.name ?? 'the data source'
          // Fire-and-forget: the popup must close fast, but the synthetic user
          // message + agent turn run in the background. The open chat WebSocket
          // keeps the DO alive long enough for the agent's response to stream.
          this.signalMcpConnected(serverName)
          return new Response('<script>window.close();</script>', {
            headers: { 'content-type': 'text/html' },
          })
        }
        const message = result.authError ?? 'authorization failed'
        return new Response(
          `<p>Authorization failed: ${escapeHtml(message)}</p><p>You can close this window and try again from the chat.</p>`,
          { status: 400, headers: { 'content-type': 'text/html' } },
        )
      },
    })
  }

  async onChatMessage(
    _onFinish: StreamTextOnFinishCallback<ToolSet>,
    opts?: OnChatMessageOptions,
  ): Promise<Response | undefined> {
    if (!this.userId) {
      // Non-fatal: PostHog events will ship without per-user attribution, but
      // chat still works. logger.error surfaces this to Sentry — investigate by
      // confirming the caller passed `props: { userId }` to `getAgentByName`.
      logger.error('dispute_agent_missing_userid', { productId: this.name })
    }

    const instructions = await this.loadInstructions()

    const model = createDisputeAgentModel({
      env: this.env,
      tracing: {
        phClient: this.analytics.posthog,
        distinctId: this.userId,
        traceId: opts?.requestId,
        properties: {
          mode: this.state.mode,
          productId: this.name,
        },
      },
    })

    // TODO(agent): add a wall-clock-based `stopWhen` (not step count) — see spec bounds.
    // Tools are passed on every turn regardless of `state.mode` for now; mode-gating
    // can be added later if the runtime extraction loop should not see web tools.
    const agent = new ToolLoopAgent({
      id: 'dispute-agent',
      model,
      instructions,
      tools: this.buildTools(),
    })

    const result = await agent.stream({
      messages: await convertToModelMessages(this.messages),
    })

    return result.toUIMessageStreamResponse()
  }

  /**
   * Onboarding web tools. Defined inline for now; TODO(agent) extract each into
   * a typed command + handler once the surface stabilizes.
   *
   * - `fetchUrl` — reads a URL via Jina Reader, caches full markdown in DO storage
   *   keyed by URL, returns a chunk starting at `offset` (default 0). To page,
   *   call again with the same `url` and `offset = nextOffset` from the prior call.
   * - `webSearch` — open-ended discovery via Jina Search (SERP metadata only,
   *   `X-Respond-With: no-content`). Agent follows up with `fetchUrl` to read a
   *   promising result.
   */
  private buildTools(): ToolSet {
    const jina = this.deps.services.jinaClient()
    const storage = this.ctx.storage

    return {
      // Tools exposed by any connected MCP server (merchant DB, etc.). Empty until
      // `connectMcpServer` runs successfully.
      ...this.mcp.getAITools(),

      // TODO(agent): extract to a ConnectMcpServer command + handler.
      connectMcpServer: tool({
        description:
          'Connect a Model Context Protocol (MCP) server so we can use its tools to find evidence proofs (e.g., the merchant\'s database for user activity). Provide a memorable `name` and the MCP server `url` you discovered via webSearch/fetchUrl. Prefer explaining the server you found and asking the merchant before connecting. If the server needs OAuth, returns `state: "authenticating"` with an `authUrl` — surface that to the merchant as a clickable markdown link so they can authorize. After authorization, you will be notified automatically and can continue without waiting for the merchant to type anything.',
        inputSchema: z.object({
          name: z.string().min(1).max(50),
          url: z.url(),
        }),
        execute: async ({ name, url }) => {
          // Idempotent: if this URL is already connected, return it. If any prior
          // attempt is stuck/failed/mid-auth, collect their ids and clear in parallel.
          const { servers } = this.getMcpServers()
          const staleIds: string[] = []
          for (const [id, server] of Object.entries(servers)) {
            if (server.server_url !== url) continue
            if (server.state === 'ready') {
              return { ok: true as const, state: 'ready', id }
            }
            staleIds.push(id)
          }
          await Promise.all(staleIds.map((id) => this.removeMcpServer(id)))
          // `agentsPrefix` must match the prefix our catchall route uses
          // (`prefix: 'api/agents'` in routes/api/agents/$.ts). Without it the
          // SDK generates a `redirect_uri` under `/agents/...` which 404s.
          //
          const result = await this.addMcpServer(name, url, { agentsPrefix: 'api/agents' })
          if (result.state === 'authenticating') {
            return { ok: true as const, state: 'authenticating', authUrl: result.authUrl }
          }
          return { ok: true as const, state: 'ready', id: result.id }
        },
      }),

      // TODO(agent): extract to a FetchUrl command + handler.
      fetchUrl: tool({
        description:
          'Fetch a URL as markdown. Returns a chunk (8000 chars max) starting at `offset` (default 0), plus `nextOffset` to continue reading. Call again with the same `url` and `offset = nextOffset` to page through long pages. `nextOffset` is null when no more content remains. Cached for 60min per URL; re-fetched if expired.',
        inputSchema: z.object({
          url: z.url(),
          offset: z.number().int().min(0).optional(),
        }),
        execute: async ({ url, offset = 0 }) => {
          const key = `${FETCH_CACHE_PREFIX}${url}`
          let cached = await storage.get<CachedFetchDoc>(key)
          if (!cached || cached.expiresAt < Date.now()) {
            const fetched = await jina.fetchUrl({ url })
            if (fetched.isErr()) {
              return { ok: false as const, error: fetched.error.message }
            }
            cached = {
              url: fetched.value.url,
              title: fetched.value.title,
              content: fetched.value.content,
              expiresAt: Date.now() + FETCH_CACHE_TTL_MS,
            }
            await storage.put(key, cached)
          }
          const chunk = cached.content.slice(offset, offset + FETCH_CHUNK_SIZE)
          const nextOffset = offset + chunk.length
          return {
            ok: true as const,
            url: cached.url,
            title: cached.title,
            content: chunk,
            totalChars: cached.content.length,
            nextOffset: nextOffset < cached.content.length ? nextOffset : null,
          }
        },
      }),

      // TODO(agent): extract to a WebSearch command + handler.
      webSearch: tool({
        description:
          'Search the web for open-ended discovery. Returns SERP entries (title, URL, description) without page contents — call fetchUrl on a promising result if you need to read it. Use for finding an MCP server URL or unknown docs page; do not use when the exact URL is already known.',
        inputSchema: z.object({
          query: z.string().min(1),
          numResults: z.number().int().min(1).max(10).optional(),
        }),
        execute: async ({ query, numResults }) => {
          const result = await jina.webSearch({ query, numResults })
          if (result.isErr()) {
            return { ok: false as const, error: result.error.message }
          }
          return { ok: true as const, results: result.value.results }
        },
      }),
    }
  }

  /** Builds the dynamic system prompt for this turn. Fail-soft: falls back to {@link BASE_PROMPT} so chat still works if PG is degraded. */
  private async loadInstructions(): Promise<string> {
    if (!this.userId) return BASE_PROMPT
    const product = await this.deps.repos.products(this.deps.db()).findById(this.name)
    if (product.isErr() || !product.value) {
      logger.warn('load_instructions_product_missing', {
        productId: this.name,
        error: product.isErr() ? product.error : 'not_found',
      })
      return BASE_PROMPT
    }
    const setup = await this.deps.services
      .productSetup()
      .getState({ userId: this.userId, productId: this.name })
    if (setup.isErr()) {
      logger.warn('load_instructions_setup_failed', { productId: this.name, error: setup.error })
      return BASE_PROMPT
    }
    return buildSystemPrompt(product.value.serialize(), setup.value)
  }

  /** RPC seed for the agent page — WS doesn't replay history on connect. */
  async getMessages(): Promise<UIMessage[]> {
    return this.messages
  }

  /** Synthesizes an "MCP connected" user turn so the agent picks up the new MCP tools without merchant input. Called from the OAuth callback's `customHandler` after a successful authorization. */
  async signalMcpConnected(serverName: string): Promise<void> {
    await this.saveMessages((messages) => [
      ...messages,
      {
        id: `mcp-connected-${serverName}-${Date.now()}`,
        role: 'user',
        parts: [
          {
            type: 'text',
            text: `Connection event: OAuth authorization succeeded for the MCP: "${serverName}".`,
          },
        ],
      },
    ])
  }

  /** Synthesizes a "Stripe connected" user turn so the agent advances onboarding. `saveMessages` (not `persistMessages`) triggers the next model turn and serializes behind any in-flight stream. */
  async signalStripeConnected(): Promise<void> {
    await this.saveMessages((messages) => [
      ...messages,
      {
        id: 'stripe-connected',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Connection event: Stripe authorization succeeded for this product. Continue onboarding from the previous step.',
          },
        ],
      },
    ])
  }

  /**
   * Idempotent welcome-message prime. Called from the CreateProduct command
   * handler after the product is persisted, so the chat is populated before
   * the merchant ever navigates to the agent page.
   */
  async primeOnboarding(args: {
    productId: string
    productName: string
    connectStripeUrl: string
  }) {
    if (this.messages.length > 0) return
    await this.persistMessages([
      {
        id: 'welcome',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text:
              `Hi, I'm **Riposte**. I'll defend **${args.productName}** against Stripe disputes. ` +
              `To start, I need access to your Stripe account so I can read disputes and submit evidence on your behalf. ` +
              `[Connect Stripe →](${args.connectStripeUrl})`,
          },
        ],
      },
    ])
  }
  /**
   * Base class overloads this as `(connection, error)` (WS) and `(error)`
   * (HTTP). Single impl satisfies both. Logged at `warn` so the breadcrumb
   * carries `productId` context without double-firing to Sentry — the DO
   * instrumentation captures the rethrow as the canonical error event.
   */
  onError(connection: unknown, error: unknown): void
  onError(error: unknown): void
  onError(connectionOrError: unknown, error?: unknown): void {
    const actualError = error !== undefined ? error : connectionOrError
    logger.warn('dispute_agent_error', { error: actualError, productId: this.name })
    throw actualError
  }

  async onWorkflowError(workflowName: string, workflowId: string, error: string): Promise<void> {
    logger.error('workflow_error', {
      error,
      workflowId,
      workflowName,
    })
  }
}

export const InstrumentedDisputeAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgent,
)
export type DisputeAgentType = InstanceType<typeof DisputeAgent>
