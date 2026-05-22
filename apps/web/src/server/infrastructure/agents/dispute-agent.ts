import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import {
  createCommand,
  createLogger,
  createSentryOptions,
  InternalServerError,
  type UserId,
} from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { BASE_PROMPT, buildSystemPrompt } from '@server/infrastructure/agents/build-system-prompt'
import {
  applyDisputeAgentCompactions,
  compactDisputeAgentMessages,
} from '@server/infrastructure/agents/dispute-agent.compaction'
import {
  createDisputeAgentCompactionStore,
  DISPUTE_AGENT_SESSION_ID,
  migrateDisputeAgentCompactionStorage,
} from '@server/infrastructure/agents/dispute-agent.compaction.storage'
import {
  buildEstimatedUsage,
  createInitialDisputeAgentContextState,
  type DisputeAgentCompactionState,
  type DisputeAgentContextState,
  INITIAL_ESTIMATED_USAGE,
  INITIAL_USAGE,
  nextDisputeAgentContextState,
} from '@server/infrastructure/agents/dispute-agent.context'
import {
  createMcpOAuthCallbackHandler,
  RiposteMcpOAuthProvider,
} from '@server/infrastructure/agents/dispute-agent.oauth'
import { buildDisputeAgentToolCallRepair } from '@server/infrastructure/agents/dispute-agent.repair'
import { buildDisputeAgentTools } from '@server/infrastructure/agents/dispute-agent.tools'
import {
  createDisputeAgentModel,
  DISPUTE_AGENT_MODEL,
} from '@server/infrastructure/ai/model-factory'
import type { IAnalyticsService } from '@server/infrastructure/analytics/analytics-service'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import type { AgentMcpOAuthProvider } from 'agents'
import { estimateMessageTokens, estimateStringTokens } from 'agents/experimental/memory/utils'
import {
  convertToModelMessages,
  type LanguageModel,
  type LanguageModelUsage,
  type StreamTextOnFinishCallback,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { Result, type Result as ResultType } from 'better-result'

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

type PrimeProductSetupArgs = {
  productName: string
  connectStripeUrl: string
}

function buildProductSetupWelcomeMessage(args: PrimeProductSetupArgs): UIMessage<never> {
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
const PRIME_PRODUCT_SETUP_STORAGE_KEY = 'primeProductSetup'

type PrepareMessagesError = InternalServerError

class DisputeAgent extends AIChatAgent<Env, DisputeAgentState, DisputeAgentProps> {
  readonly deps: AppDeps
  private readonly analytics: IAnalyticsService

  initialState: DisputeAgentState = {
    mode: 'setup',
    setupChangeId: null,
    context: createInitialDisputeAgentContextState(DISPUTE_AGENT_MODEL.label),
  }

  private userId?: UserId
  /**
   * Active compaction's abort controller. Set when compaction begins, cleared
   * when it ends (success or failure). The cancel-compaction server function
   * fires `abort()` on this, which propagates into `generateText` inside the
   * summarizer and short-circuits the operation.
   */
  private compactionAbortController: AbortController | null = null

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    state.blockConcurrencyWhile(async () => {
      migrateDisputeAgentCompactionStorage(state.storage)
    })
    this.deps = createAppDeps(env, state)
    this.analytics = this.deps.services.analytics()
    // Refresh the FE estimate whenever MCP state transitions (server added,
    // OAuth completed, tools discovered, server removed). Per the SDK docs:
    // `onServerStateChanged is an Event<void>` returning a disposable.
    // Subscription is for the lifetime of the DO; we don't dispose explicitly
    // because the SDK's MCPClientManager owns the emitter and cleans up on
    // its own dispose().
    this.mcp.onServerStateChanged(() => {
      this.ctx.waitUntil(this.refreshContextEstimate())
    })
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

    this.migrateContextStateIfNeeded()
    this.mcp.configureOAuthCallback({ customHandler: createMcpOAuthCallbackHandler(this) })
  }

  /**
   * One-shot normalizer for persisted state predating the context refactor:
   *  - `compaction: null` → `{ status: 'idle' }`
   *  - missing `estimatedUsage` → `INITIAL_ESTIMATED_USAGE`
   *
   * Idempotent — runs on every boot, no-op once state is on the new shape.
   * Can be removed once we're confident no live DO carries the old shape.
   */
  private migrateContextStateIfNeeded(): void {
    const current = this.state.context as unknown as {
      modelName?: string
      usage?: typeof INITIAL_USAGE
      compaction?: DisputeAgentCompactionState | null
      estimatedUsage?: typeof INITIAL_ESTIMATED_USAGE
    } | null
    if (
      current &&
      current.modelName !== undefined &&
      current.compaction !== null &&
      current.compaction !== undefined &&
      current.estimatedUsage !== undefined
    ) {
      return
    }
    const base = createInitialDisputeAgentContextState(
      current?.modelName ?? DISPUTE_AGENT_MODEL.label,
    )
    this.setState({
      ...this.state,
      context: nextDisputeAgentContextState(base, {
        usage: current?.usage ?? INITIAL_USAGE,
        compaction: { status: 'idle' },
        estimatedUsage: current?.estimatedUsage ?? INITIAL_ESTIMATED_USAGE,
      }),
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

    // TODO(perf): when `opts?.continuation === true` (auto-continue after a
    // tool result), instructions + tools are guaranteed identical to the prior
    // step — cache them per-turn to skip 2 Postgres reads on every continuation.
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

    const prepared = await this.prepareMessagesForModel(model)
    if (prepared.isErr()) {
      logger.warn('dispute_agent_prepare_messages_failed', {
        error: prepared.error,
        mode: this.state.mode,
        productId: this.name,
        requestId: opts?.requestId,
        context: this.state.context,
      })
      return Response.json({ error: prepared.error.message }, { status: 503 })
    }

    await this.mcp.waitForConnections({ timeout: 10_000 })

    // TODO(agent): add a wall-clock-based `stopWhen` (not step count) — see spec bounds.
    const tools = buildDisputeAgentTools(this, this.ctx.storage)
    logger.debug('dispute_agent_tools_ready', {
      mode: this.state.mode,
      requestId: opts?.requestId,
      toolCount: Object.keys(tools).length,
      mcpServers: Object.fromEntries(
        Object.entries(this.getMcpServers().servers).map(([serverId, server]) => [
          serverId,
          { name: server.name, state: server.state },
        ]),
      ),
    })

    const agent = new ToolLoopAgent({
      id: 'dispute-agent',
      model,
      instructions,
      tools,
      experimental_repairToolCall: buildDisputeAgentToolCallRepair({
        env: this.env,
        mode: this.state.mode,
        productId: this.name,
        requestId: opts?.requestId,
      }),
      onFinish: ({ usage }) => {
        // Use the LAST step's usage, not `totalUsage`. In a multi-step tool
        // loop, `totalUsage` is the billing aggregate across all steps and can
        // far exceed the context window; `usage` is what one model call saw,
        // which is what window-pressure decisions (compaction, popover) care
        // about.
        this.updateUsage(usage)
        this.ctx.waitUntil(this.refreshContextEstimate())
      },
    })

    const result = await agent.stream({
      messages: await convertToModelMessages(prepared.value),
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
    if (usage.totalTokens === undefined) {
      logger.warn('dispute_agent_usage_missing_total', { usage, productId: this.name })
      return
    }
    const realInputTokens = usage.inputTokens ?? 0
    const estimatedTotalTokens = this.state.context.estimatedUsage.total
    const staticTokens = this.state.context.estimatedUsage.byCategory
      .filter((b) => b.category !== 'messages')
      .reduce((sum, b) => sum + b.tokens, 0)
    // Compact summary — full per-category breakdown is on state.context.estimatedUsage
    // for the FE; logs only need the scalars we'd chart against.
    logger.debug('dispute_agent_usage_update', {
      inputTokens: realInputTokens,
      outputTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens,
      compactAtTokens: this.state.context.compactAtTokens,
      estimatedTotalTokens,
      ratio: estimatedTotalTokens > 0 ? realInputTokens / estimatedTotalTokens : null,
      staticTokens,
    })
    this.setState({
      ...this.state,
      context: nextDisputeAgentContextState(this.state.context, {
        usage: {
          inputTokens: realInputTokens,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens,
          updatedAt: new Date().toISOString(),
        },
      }),
    })
  }

  private setCompactionState(compaction: DisputeAgentCompactionState): void {
    this.setState({
      ...this.state,
      context: nextDisputeAgentContextState(this.state.context, { compaction }),
    })
  }

  private startCompaction(): void {
    this.setCompactionState({ status: 'compacting', startedAt: new Date().toISOString() })
  }

  private failCompaction(error: Error): void {
    this.setCompactionState({
      status: 'failed',
      failedAt: new Date().toISOString(),
      message: error.message,
    })
  }

  private completeCompaction(): void {
    this.setCompactionState({ status: 'idle' })
  }

  async cancelCompaction(): Promise<void> {
    this.compactionAbortController?.abort()
  }

  getCurrentUserId(): UserId {
    if (!this.userId) {
      throw new Error('DisputeAgent started without authenticated user context')
    }
    return this.userId
  }

  /**
   * Recomputes the per-category estimated usage (system prompt + per-tool +
   * messages) and persists it onto `state.context.estimatedUsage`. Cheap
   * heuristic (chars/4 + word fudge) — for FE visibility only; the compaction
   * trigger never reads this, it reads real `usage.totalTokens`.
   *
   * Call sites: after each chat turn, on MCP connect/disconnect, on setup
   * change.
   */
  private async refreshContextEstimate(): Promise<void> {
    const instructions = await this.loadInstructions()
    const mcpTools = this.mcp.getAITools() as Record<string, unknown>
    const allTools = buildDisputeAgentTools(this, this.ctx.storage) as Record<string, unknown>
    const systemTools = Object.fromEntries(
      Object.entries(allTools).filter(([key]) => !(key in mcpTools)),
    )
    const estimatedUsage = buildEstimatedUsage({
      instructions,
      systemTools,
      mcpTools,
      messages: this.messages,
      lastRealTotalTokens: this.state.context.usage.totalTokens,
      estimateString: estimateStringTokens,
      estimateMessages: (messages) => estimateMessageTokens(messages as UIMessage[]),
    })
    this.setState({
      ...this.state,
      context: nextDisputeAgentContextState(this.state.context, { estimatedUsage }),
    })
  }

  private async prepareMessagesForModel(
    model: LanguageModel,
  ): Promise<ResultType<UIMessage[], PrepareMessagesError>> {
    const compactionStore = createDisputeAgentCompactionStore(this.ctx.storage)
    const overlays = compactionStore.list(DISPUTE_AGENT_SESSION_ID)
    const messagesForModel = applyDisputeAgentCompactions(this.messages, overlays)

    logger.debug('dispute_agent_prepare_messages_decision', {
      status: this.state.context.status,
      totalTokens: this.state.context.usage.totalTokens,
      compactAtTokens: this.state.context.compactAtTokens,
      overlayCount: overlays.length,
    })

    if (this.state.context.status !== 'compact_required') {
      return Result.ok(messagesForModel)
    }

    this.startCompaction()
    this.compactionAbortController = new AbortController()
    const compaction = await compactDisputeAgentMessages({
      messages: this.messages,
      overlays,
      model,
      saveOverlay: (args) => compactionStore.add(args),
      abortSignal: this.compactionAbortController.signal,
    })
    this.compactionAbortController = null

    if (!compaction.ok) {
      // Surface the static/messages split so we can tell at a glance whether
      // the deadlock is "static overhead exceeds threshold" (compaction can't
      // help) vs "messages legitimately failed to summarize".
      const byCategory = this.state.context.estimatedUsage.byCategory
      const staticTokens = byCategory
        .filter((b) => b.category !== 'messages')
        .reduce((sum, b) => sum + b.tokens, 0)
      const messagesTokens = byCategory.find((b) => b.category === 'messages')?.tokens ?? 0
      logger.warn('dispute_agent_compaction_failed', {
        error: compaction.error,
        productId: this.name,
        compactAtTokens: this.state.context.compactAtTokens,
        usageTotalTokens: this.state.context.usage.totalTokens,
        staticTokens,
        messagesTokens,
        staticExceedsThreshold: staticTokens >= this.state.context.compactAtTokens,
      })
      this.failCompaction(compaction.error)
      return Result.err(
        new InternalServerError({
          message: 'Failed to compact conversation',
        }),
      )
    }

    this.completeCompaction()
    return Result.ok(compaction.messages)
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
    await Promise.all(Object.keys(servers).map(async (serverId) => this.removeMcpServer(serverId)))
    this.setState({
      ...this.state,
      mode: 'setup',
      context: createInitialDisputeAgentContextState(DISPUTE_AGENT_MODEL.label),
    })
    await this.clearConversation()
    createDisputeAgentCompactionStore(this.ctx.storage).clear(DISPUTE_AGENT_SESSION_ID)
    await this.refreshContextEstimate()

    return { ok: true }
  }

  async signalProductSetupChanged(setupChangeId: string): Promise<void> {
    this.setState({ ...this.state, setupChangeId })
    await this.refreshContextEstimate()
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
    // No refresh here: `broadcastMcpServers` already fires `refreshContextEstimate`
    // whenever MCP state transitions (including tool discovery after OAuth).
  }

  async signalMcpDisconnected(serverName: string): Promise<void> {
    await this.appendSystemEvent(
      `mcp-disconnected-${serverName}-${Date.now()}`,
      `Connection event: MCP server "${serverName}" was disconnected by the user.`,
    )
    // No refresh here: see signalMcpConnected.
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
      'Connection event: Stripe authorization succeeded for this product. Continue product setup from the previous step.',
    )
    await this.refreshContextEstimate()
  }

  /** Clears the current conversation and writes the product setup welcome message. */
  async primeProductSetup(args: PrimeProductSetupArgs) {
    await this.ctx.storage.put(PRIME_PRODUCT_SETUP_STORAGE_KEY, args)
    await this.clearConversation()
    await this.persistMessages([buildProductSetupWelcomeMessage(args)])
    await this.refreshContextEstimate()
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
