import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import { createCommand, createLogger, createSentryOptions, type UserId } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { BASE_PROMPT, buildSystemPrompt } from '@server/infrastructure/agents/build-system-prompt'
import {
  createDisputeAgentContextState,
  type DisputeAgentContextState,
} from '@server/infrastructure/agents/dispute-agent.context'
import {
  createMcpOAuthCallbackHandler,
  RiposteMcpOAuthProvider,
} from '@server/infrastructure/agents/dispute-agent.oauth'
import { buildDisputeAgentTools } from '@server/infrastructure/agents/dispute-agent.tools'
import { createDisputeAgentModel } from '@server/infrastructure/ai/model-factory'
import type { IAnalyticsService } from '@server/infrastructure/analytics/analytics-service'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import type { AgentMcpOAuthProvider } from 'agents'
import {
  convertToModelMessages,
  type LanguageModelUsage,
  type StreamTextOnFinishCallback,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
} from 'ai'

type ReadyMcpServerResult =
  | {
      ok: true
      serverId: string
      serverName: string
    }
  | {
      ok: false
      reason: 'not_found'
      retryable: false
      message: string
    }
  | {
      ok: false
      reason: 'not_ready'
      state: string
      retryable: boolean
      message: string
    }

type PrimeOnboardingArgs = {
  productName: string
  connectStripeUrl: string
}

function buildOnboardingWelcomeMessage(args: PrimeOnboardingArgs): UIMessage<never> {
  return {
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
  }
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
  setupChangeId: string | null
  context: DisputeAgentContextState
}

/** Upgrade-time props forwarded from the auth-verified route — see `routes/api/agents/$.ts`. */
export type DisputeAgentProps = {
  userId: UserId
}

const USER_ID_STORAGE_KEY = 'userId'
const PRIME_ONBOARDING_STORAGE_KEY = 'primeOnboarding'

class DisputeAgent extends AIChatAgent<Env, DisputeAgentState, DisputeAgentProps> {
  readonly deps: AppDeps
  private readonly analytics: IAnalyticsService

  initialState: DisputeAgentState = {
    mode: 'setup',
    setupChangeId: null,
    context: createDisputeAgentContextState(),
  }

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

    this.mcp.configureOAuthCallback({ customHandler: createMcpOAuthCallbackHandler(this) })
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
    const tools = buildDisputeAgentTools(this, this.ctx.storage)

    const agent = new ToolLoopAgent({
      id: 'dispute-agent',
      model,
      instructions,
      tools,
      onFinish: ({ totalUsage }) => {
        this.updateUsage(totalUsage)
      },
    })

    const result = await agent.stream({
      messages: await convertToModelMessages(this.messages),
      abortSignal: opts?.abortSignal,
    })

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        logger.warn('dispute_agent_stream_error', {
          error,
          mode: this.state.mode,
          productId: this.name,
          requestId: opts?.requestId,
        })
        throw error
      },
    })
  }

  private updateUsage(usage: LanguageModelUsage): void {
    if (usage.totalTokens === undefined) return
    this.setState({
      ...this.state,
      context: createDisputeAgentContextState({
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        totalTokens: usage.totalTokens,
        updatedAt: new Date().toISOString(),
      }),
    })
  }

  /** Builds the dynamic system prompt for this turn. Fail-soft: falls back to {@link BASE_PROMPT} so chat still works if PG is degraded. */
  private async loadInstructions(): Promise<string> {
    if (!this.userId) return BASE_PROMPT
    const product = await this.deps.repos.products(this.deps.db()).findById(this.name)
    if (product.isErr()) {
      logger.error('load_instructions_product_repo_failed', {
        productId: this.name,
        error: product.error,
      })
      return BASE_PROMPT
    }
    if (!product.value) {
      logger.error('load_instructions_product_not_found', { productId: this.name })
      return BASE_PROMPT
    }
    const setup = await this.deps.services
      .productSetup()
      .getState({ userId: this.userId, productId: this.name })
    if (setup.isErr()) {
      logger.error('load_instructions_setup_failed', {
        productId: this.name,
        userId: this.userId,
        error: setup.error,
      })
      return BASE_PROMPT
    }
    return buildSystemPrompt(product.value.serialize(), setup.value)
  }

  /** RPC seed for the agent page — WS doesn't replay history on connect. */
  async getMessages(): Promise<UIMessage[]> {
    return this.messages
  }

  async restartSetup(): Promise<{ ok: true } | { ok: false; error: string }> {
    const { servers } = this.getMcpServers()
    await Promise.all(Object.keys(servers).map((serverId) => this.removeMcpServer(serverId)))
    this.setState({
      ...this.state,
      mode: 'setup',
      context: createDisputeAgentContextState(),
    })
    await this.clearConversation()

    return { ok: true }
  }

  async signalProductSetupChanged(setupChangeId: string): Promise<void> {
    this.setState({ ...this.state, setupChangeId })
  }

  async getReadyMcpServer(serverId: string): Promise<ReadyMcpServerResult> {
    const server = this.getMcpServers().servers[serverId]
    if (!server) {
      return {
        ok: false,
        reason: 'not_found',
        retryable: false,
        message: 'MCP server was not found.',
      }
    }

    switch (server.state) {
      case 'ready':
        return {
          ok: true,
          serverId,
          serverName: server.name,
        }
      case 'connecting':
      case 'connected':
      case 'discovering':
        return {
          ok: false,
          reason: 'not_ready',
          state: server.state,
          retryable: true,
          message: `MCP server is still ${server.state}. Check again shortly.`,
        }
      case 'authenticating':
        return {
          ok: false,
          reason: 'not_ready',
          state: server.state,
          retryable: false,
          message:
            'MCP server is waiting for OAuth authorization. Ask the merchant to authorize using the link from the connect step, or reconnect if that link is stale.',
        }
      case 'failed':
        return {
          ok: false,
          reason: 'not_ready',
          state: server.state,
          retryable: false,
          message: 'MCP server connection failed. Reconnect the server before using it.',
        }
      default:
        return {
          ok: false,
          reason: 'not_ready',
          state: String(server.state),
          retryable: false,
          message: `MCP server is not ready. Current state: ${String(server.state)}.`,
        }
    }
  }

  /**
   * Synthesizes a user-role event message and triggers the next agent turn.
   * `saveMessages` (not `persistMessages`) serializes behind any in-flight
   * stream, so the agent picks up the event on its next response.
   */
  private async appendSystemEvent(id: string, text: string): Promise<void> {
    await this.saveMessages((messages) => [
      ...messages,
      { id, role: 'user', parts: [{ type: 'text', text }] },
    ])
  }

  async signalMcpConnected({
    serverId,
    serverName,
  }: {
    serverId: string
    serverName: string
  }): Promise<void> {
    await this.appendSystemEvent(
      `mcp-connected-${serverId}-${Date.now()}`,
      `Connection event: OAuth authorization succeeded for MCP server "${serverName}". Continue setup.`,
    )
  }

  async signalMcpDisconnected(serverName: string): Promise<void> {
    await this.appendSystemEvent(
      `mcp-disconnected-${serverName}-${Date.now()}`,
      `Connection event: MCP server "${serverName}" was disconnected by the user.`,
    )
  }

  /**
   * Composite disconnect entry point called by the application layer (the
   * `disconnectProductAppDataSource` server fn) and by {@link clearMcpServers}
   * during restart. Symmetric with the register flow:
   *
   * 1. clear DO MCP state (SDK broadcasts `CF_AGENT_MCP_SERVERS` to the FE)
   * 2. synthesize a "disconnected" user turn so the agent stops trying tools
   *    from the now-removed server on its next stream
   * 3. dispatch `DisconnectProductAppDataSource` to wipe the persisted
   *    `product_app_data_sources` row
   *
   * No-op (`false`) if the server is already gone. Missing `userId` logs and
   * still completes DO cleanup — same fail-soft pattern as `onChatMessage`,
   * and the PG handler is idempotent on missing rows for a future retry.
   */
  async disconnectMcp(mcpServerId: string): Promise<boolean> {
    const server = this.getMcpServers().servers[mcpServerId]
    if (!server) return false

    await this.removeMcpServer(mcpServerId)
    await this.signalMcpDisconnected(server.name)

    if (!this.userId) {
      logger.error('disconnect_mcp_missing_userid', { productId: this.name, mcpServerId })
      return true
    }

    const command = createCommand('DisconnectProductAppDataSource', {
      userId: this.userId,
      productId: this.name,
      mcpServerId,
    })
    const result = await this.deps.services.messageBus().handle(command)
    if (result.isErr()) {
      logger.error('disconnect_mcp_pg_cleanup_failed', {
        productId: this.name,
        mcpServerId,
        error: result.error,
      })
    }

    return true
  }

  async signalStripeConnected(): Promise<void> {
    await this.appendSystemEvent(
      'stripe-connected',
      'Connection event: Stripe authorization succeeded for this product. Continue onboarding from the previous step.',
    )
  }

  /** Clears the current conversation and writes the onboarding welcome message. */
  async primeOnboarding(args: PrimeOnboardingArgs) {
    await this.ctx.storage.put(PRIME_ONBOARDING_STORAGE_KEY, args)
    await this.clearConversation()
    await this.persistMessages([buildOnboardingWelcomeMessage(args)])
  }

  private async clearConversation(): Promise<void> {
    this.resetTurnState()
    await this.persistMessages([], [], { _deleteStaleRows: true })
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
