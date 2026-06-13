import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import {
  createCommand,
  createEvent,
  createLogger,
  createSentryOptions,
  type DisputeAgentMessage,
  type McpConnectionState,
  EvidenceCollectionFailedError,
  InternalServerError,
  type ProductSetupState,
  type UserId,
  uuidv7,
} from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { buildDisputeAgentLoop } from '@server/infrastructure/agents/build-dispute-agent-loop'
import {
  buildBasePrompt,
  buildEvidenceInstructions,
  buildSystemPrompt,
} from '@server/infrastructure/agents/build-system-prompt'
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
  buildDisputeAgentTools,
  buildEvidenceCollectionTools,
  deriveActiveDisputeAgentTools,
} from '@server/infrastructure/agents/dispute-agent.tools'
import {
  createMcpOAuthCallbackHandler,
  type IMcpOAuthService,
  McpOAuthService,
  removeMcpOAuthTokenExpiry,
  RiposteMcpOAuthProvider,
} from '@server/infrastructure/agents/mcp-oauth'
import {
  createDisputeAgentModels,
  DISPUTE_AGENT_MODEL,
  type DisputeAgentModels,
} from '@server/infrastructure/ai/model-factory'
import type { IAnalyticsService } from '@server/infrastructure/analytics/analytics-service'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import { transitionalRepoRead } from '@server/infrastructure/db'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import type { AgentMcpOAuthProvider } from 'agents'
import { estimateMessageTokens, estimateStringTokens } from 'agents/experimental/memory/utils'
import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStream,
  hasToolCall,
  type LanguageModel,
  type LanguageModelUsage,
  stepCountIs,
  type StreamTextOnFinishCallback,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { Result, type Result as ResultType } from 'better-result'

type ReadyMcpServerResult =
  | {
      ok: true
      serverId: string
      serverName: string
      serverUrl: string
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

type StartEvidenceCollectionArgs = {
  disputeCaseId: string
  workflowInstanceId: string
}

type RunEvidenceCollectionArgs = StartEvidenceCollectionArgs & {
  abortSignal?: AbortSignal
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
const REFRESH_MCP_OAUTH_TOKENS_CALLBACK = 'refreshMcpOauthTokens'
const SEND_MCP_SYNC_PING_CALLBACK = 'sendMcpSyncPing'
/** Debounce window: a burst of MCP transitions collapses to one sync ping. */
const MCP_SYNC_PING_DEBOUNCE_SECONDS = 3
const DRAIN_MCP_DISCONNECT_CALLBACK = 'drainMcpDisconnect'

/** Durable intent for the PG-cleanup half of a user MCP disconnect. */
type McpDisconnectIntent = { mcpServerId: string; userId: UserId }

type PrepareMessagesError = InternalServerError

class DisputeAgent extends AIChatAgent<Env, DisputeAgentState, DisputeAgentProps> {
  readonly deps: AppDeps
  private readonly models: DisputeAgentModels
  private readonly analytics: IAnalyticsService
  private readonly mcpOAuth: IMcpOAuthService

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
    this.models = createDisputeAgentModels(env)
    this.analytics = this.deps.services.analytics()
    this.mcpOAuth = new McpOAuthService({
      storage: state.storage,
      productId: this.name,
      queueClient: () => this.deps.services.queueClient(),
    })
    // Refresh the FE estimate whenever MCP state transitions (server added,
    // OAuth completed, tools discovered, server removed). Per the SDK docs:
    // `onServerStateChanged is an Event<void>` returning a disposable.
    // Subscription is for the lifetime of the DO; we don't dispose explicitly
    // because the SDK's MCPClientManager owns the emitter and cleans up on
    // its own dispose().
    this.mcp.onServerStateChanged(() => {
      this.ctx.waitUntil(this.refreshContextEstimate())
      // Also reconcile PG: schedule a debounced, idempotent ping so the worker
      // side re-reads live MCP truth and updates product_app_data_sources.
      this.ctx.waitUntil(this.scheduleMcpStateSync())
    })
  }

  createMcpOAuthProvider(callbackUrl: string): AgentMcpOAuthProvider {
    return new RiposteMcpOAuthProvider(
      this.ctx.storage,
      this.name,
      callbackUrl,
      async (serverId, tokens, now) => this.mcpOAuth.saveTokenExpiry(serverId, tokens, now),
    )
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
    await this.scheduleNextMcpOAuthRefresh()
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
    const setup = await this.loadProductSetupState()
    const instructions = await this.loadInstructions(setup)

    const tracing = {
      phClient: this.analytics.posthog,
      distinctId: this.userId,
      traceId: opts?.requestId,
      properties: {
        mode: this.state.mode,
        productId: this.name,
      },
    }

    const model = this.models.primary({ tracing })

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
    const builtTools = buildDisputeAgentTools({
      agent: this,
      storage: this.ctx.storage,
      setup,
    })
    const { tools, activeTools } = builtTools
    logger.debug('dispute_agent_tools_ready', {
      mode: this.state.mode,
      requestId: opts?.requestId,
      toolCount: Object.keys(tools).length,
      activeToolCount: activeTools.length,
      mcpServers: Object.fromEntries(
        Object.entries(this.getMcpServers().servers).map(([serverId, server]) => [
          serverId,
          { name: server.name, state: server.state },
        ]),
      ),
    })

    const agent = buildDisputeAgentLoop({
      id: 'dispute-agent',
      model,
      instructions,
      tools,
      activeTools,
      // Cap the tool/repair loop so a spin can't run forever; the user can restart.
      stopWhen: [stepCountIs(30)],
      repair: {
        repairModel: (args) => this.models.repair(args),
        tracing,
        surface: 'chat',
        productId: this.name,
        requestId: opts?.requestId,
      },
      prepareStep: async () => {
        const nextSetup = await this.loadProductSetupState()
        return {
          activeTools: deriveActiveDisputeAgentTools({ tools, setup: nextSetup }),
        }
      },
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
      // Wall-clock backstop: kill a wedged or runaway turn; the user restarts.
      timeout: { totalMs: 300_000 },
    })

    return result.toUIMessageStreamResponse({
      // Stamp createdAt into the stream (once, at `start`) so the live streamed
      // message carries a timestamp immediately, not only after a reload.
      // `sanitizeMessageForPersistence` keeps this value when it persists.
      messageMetadata: ({ part }) =>
        part.type === 'start' ? { createdAt: new Date().toISOString() } : undefined,
      onError: (error) => {
        logger.warn('dispute_agent_stream_error', {
          error,
          mode: this.state.mode,
          productId: this.name,
          requestId: opts?.requestId,
        })
        return error instanceof Error ? error.message : String(error)
      },
    })
  }

  private updateUsage(usage: LanguageModelUsage): void {
    if (usage.totalTokens === undefined) {
      logger.warn('dispute_agent_usage_missing_total', { usage, productId: this.name })
      return
    }
    const realInputTokens = usage.inputTokens ?? 0
    const estimatedInputTokens = this.state.context.estimatedUsage.total
    const estimatedSystemAndToolInputTokens = this.state.context.estimatedUsage.byCategory
      .filter((b) => b.category !== 'messages')
      .reduce((sum, b) => sum + b.tokens, 0)
    const estimatedMessageInputTokens =
      this.state.context.estimatedUsage.byCategory.find((b) => b.category === 'messages')?.tokens ??
      0
    const systemAndToolInputOverProviderInputTokens = Math.max(
      0,
      estimatedSystemAndToolInputTokens - realInputTokens,
    )
    const topToolEstimates = this.state.context.estimatedUsage.byCategory
      .flatMap((part) => part.children ?? [])
      .toSorted((a, b) => b.tokens - a.tokens)
      .slice(0, 5)
      .map((toolEstimate) => ({
        tool: toolEstimate.label,
        estimatedTokens: toolEstimate.tokens,
      }))
    // Compact summary — full per-category breakdown is on state.context.estimatedUsage
    // for the FE; logs only need the scalars we'd chart against.
    logger.debug('dispute_agent_usage_update', {
      inputTokens: realInputTokens,
      outputTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens,
      compactAtTokens: this.state.context.compactAtTokens,
      estimatedInputTokens,
      inputEstimateRatio: estimatedInputTokens > 0 ? realInputTokens / estimatedInputTokens : null,
      estimatedSystemAndToolInputTokens,
    })
    logger.debug('dispute_agent_usage_estimate_accuracy', {
      model: this.state.context.modelName,
      productId: this.name,
      providerInputTokens: realInputTokens,
      providerOutputTokens: usage.outputTokens ?? 0,
      providerTotalTokens: usage.totalTokens,
      estimatedInputTokens,
      estimatedSystemAndToolInputTokens,
      estimatedMessageInputTokens,
      inputEstimateDeltaTokens: estimatedInputTokens - realInputTokens,
      inputEstimateRatio: estimatedInputTokens > 0 ? realInputTokens / estimatedInputTokens : null,
      inputEstimateErrorPercent:
        realInputTokens > 0
          ? ((estimatedInputTokens - realInputTokens) / realInputTokens) * 100
          : null,
      systemAndToolInputOverProviderInputTokens,
      topToolEstimates,
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
    const setup = await this.loadProductSetupState()
    const instructions = await this.loadInstructions(setup)
    const mcpTools = this.mcp.getAITools() as Record<string, unknown>
    const { tools, activeTools } = buildDisputeAgentTools({
      agent: this,
      storage: this.ctx.storage,
      setup,
    })
    const activeToolSet = new Set(activeTools)
    const allTools = Object.fromEntries(
      Object.entries(tools).filter(([key]) => activeToolSet.has(key)),
    )
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
      const systemAndToolInputTokens = byCategory
        .filter((b) => b.category !== 'messages')
        .reduce((sum, b) => sum + b.tokens, 0)
      const messageInputTokens = byCategory.find((b) => b.category === 'messages')?.tokens ?? 0
      logger.warn('dispute_agent_compaction_failed', {
        error: compaction.error,
        productId: this.name,
        compactAtTokens: this.state.context.compactAtTokens,
        usageTotalTokens: this.state.context.usage.totalTokens,
        systemAndToolInputTokens,
        messageInputTokens,
        systemAndToolInputExceedsThreshold:
          systemAndToolInputTokens >= this.state.context.compactAtTokens,
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

  private async loadProductSetupState(): Promise<ProductSetupState | null> {
    if (!this.userId) return null
    const setup = await this.deps.services
      .productSetup()
      .getState({ userId: this.userId, productId: this.name })
    if (setup.isErr()) {
      logger.error('load_product_setup_state_failed', {
        productId: this.name,
        userId: this.userId,
        error: setup.error,
      })
      return null
    }
    return setup.value
  }

  /** Builds the dynamic system prompt for this turn. Fail-soft so chat still works if PG is degraded. */
  private async loadInstructions(setup: ProductSetupState | null): Promise<string> {
    const debugMode = (this.deps.env.ENV as string) === 'development'
    const basePrompt = buildBasePrompt({ debugMode })
    if (!this.userId) return basePrompt
    const product = await this.deps.repos
      .products(transitionalRepoRead(this.deps.readDb()))
      .findById(this.name)
    if (product.isErr()) {
      logger.error('load_instructions_product_repo_failed', {
        productId: this.name,
        error: product.error,
      })
      return basePrompt
    }
    if (!product.value) {
      logger.error('load_instructions_product_not_found', { productId: this.name })
      return basePrompt
    }
    if (!setup) {
      return basePrompt
    }
    return buildSystemPrompt(product.value.serialize(), setup, { debugMode })
  }

  /** RPC seed for the agent page — WS doesn't replay history on connect. */
  async getMessages(): Promise<DisputeAgentMessage[]> {
    return this.messages as DisputeAgentMessage[]
  }

  async restartSetup(): Promise<{ ok: true } | { ok: false; error: string }> {
    const { servers } = this.getMcpServers()
    await Promise.all(
      Object.keys(servers).map(async (serverId) => {
        await this.removeMcpServer(serverId)
        await this.mcpOAuth.removeTokenExpiry(serverId)
      }),
    )
    await this.scheduleNextMcpOAuthRefresh()
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

  async startEvidenceCollection(args: StartEvidenceCollectionArgs): Promise<{ fiberId: string }> {
    const receipt = await this.startFiber(
      `collect-dispute-evidence:${args.disputeCaseId}`,
      async (ctx) => {
        await this.runEvidenceCollection({ ...args, abortSignal: ctx.signal })
      },
      {
        metadata: {
          disputeCaseId: args.disputeCaseId,
          workflowInstanceId: args.workflowInstanceId,
        },
      },
    )
    return { fiberId: receipt.fiberId }
  }

  /**
   * Background evidence-collection loop. Runs inside a `runFiber` callback
   * (see `startEvidenceCollection`). Uses the shared `buildDisputeAgentLoop`
   * factory for repair plumbing but builds its own tools + prompt; chat
   * state and `this.messages` are not touched.
   *
   * The run's assembled UIMessage is persisted via `SaveDisputeCaseMessage`
   * (upsert by message id) on every step for the live feed and once more on
   * finish as a guard; a payload-free `dispute_case_messages_updated` ping
   * broadcasts per step and `dispute_case_messages_finished` on completion. The
   * agent calls `completeEvidenceCollection` to end
   * the run; a step-cap fallback fires the same command if the agent never does.
   *
   * TODO(stop-when): tune step cap once we observe real runs.
   * TODO(test): integration test through `runInDurableObject` once the
   * shape is stable.
   */
  private async runEvidenceCollection(args: RunEvidenceCollectionArgs): Promise<void> {
    const runId = uuidv7()
    // One message id per run, reused across retry attempts (like `runId`). A
    // transient retry then upserts over its own partial row instead of leaving
    // an orphan; the failed attempt's detail still lives in the PostHog trace.
    const messageId = uuidv7()

    const tracing = {
      phClient: this.analytics.posthog,
      distinctId: this.userId,
      traceId: runId,
      properties: {
        kind: 'evidence_collection',
        productId: this.name,
        disputeCaseId: args.disputeCaseId,
        runId,
      },
    }

    const model = this.models.primary({ tracing })
    const { tools, activeTools } = buildEvidenceCollectionTools({
      agent: this,
      disputeCaseId: args.disputeCaseId,
    })
    const debugMode = (this.deps.env.ENV as string) === 'development'
    const instructions = buildEvidenceInstructions({ debugMode })

    const loop = buildDisputeAgentLoop({
      id: 'dispute-evidence-collection',
      model,
      instructions,
      tools,
      activeTools,
      stopWhen: [stepCountIs(50), hasToolCall('completeEvidenceCollection')],
      repair: {
        repairModel: (repairArgs) => this.models.repair(repairArgs),
        tracing,
        surface: 'evidence_collection',
        productId: this.name,
        requestId: runId,
      },
    })

    const saveMessage = async (
      message: UIMessage<never>,
      event: 'dispute_case_messages_updated' | 'dispute_case_messages_finished',
    ): Promise<void> => {
      const saved = await this.deps.services.messageBus().handle(
        createCommand('SaveDisputeCaseMessage', {
          productId: this.name,
          disputeCaseId: args.disputeCaseId,
          runId,
          message: { id: messageId, role: message.role, parts: message.parts },
        }),
      )
      if (saved.isOk()) {
        this.broadcastJson({ type: event, disputeCaseId: args.disputeCaseId, runId })
      } else {
        logger.warn('evidence_step_persist_failed', {
          error: saved.error,
          runId,
          disputeCaseId: args.disputeCaseId,
          productId: this.name,
        })
      }
    }

    const turn = await Result.tryPromise(
      {
        try: async () => {
          const streamResult = await loop.stream({
            abortSignal: args.abortSignal,
            // Wall-clock backstop under the workflow's 30-min waitForEvent; catches doom loops/hangs.
            timeout: { totalMs: 600_000 },
            prompt:
              `A new dispute has come in: ${args.disputeCaseId}. ` +
              `Read its details, gather evidence per your instructions, ` +
              `and call completeEvidenceCollection when done.`,
          })
          // The SDK assembles one UIMessage per turn (stable id, parts grow over
          // steps). `onStepFinish` upserts it for the live feed; `onFinish`
          // upserts the final message as a guard if a step write failed. No HTTP
          // client consumes this stream, so `consumeStream` drives it to finish.
          await consumeStream({
            stream: createUIMessageStream<UIMessage<never>>({
              execute: ({ writer }) => {
                writer.merge(streamResult.toUIMessageStream({ generateMessageId: () => messageId }))
              },
              onStepFinish: async ({ responseMessage }) =>
                saveMessage(responseMessage, 'dispute_case_messages_updated'),
              onFinish: async ({ responseMessage }) =>
                saveMessage(responseMessage, 'dispute_case_messages_finished'),
            }),
          })
          // `stream()` resolves even when generation fails; awaiting a result
          // promise rethrows the error so RETRY + the failure event engage.
          await streamResult.finishReason
          return streamResult
        },
        catch: (cause) =>
          new EvidenceCollectionFailedError({
            disputeCaseId: args.disputeCaseId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.externalApi,
    )

    if (turn.isErr()) {
      logger.error('evidence_collection_failed', {
        error: turn.error,
        runId,
        disputeCaseId: args.disputeCaseId,
        productId: this.name,
      })
      const sent = await this.deps.services
        .queueClient()
        .send(createEvent('DisputeEvidenceCollectionFailed', { disputeCaseId: args.disputeCaseId }))
      if (sent.isErr()) {
        logger.error('evidence_collection_fail_event_send_error', {
          error: sent.error,
          runId,
          disputeCaseId: args.disputeCaseId,
          productId: this.name,
        })
      }
      return
    }

    const steps = await turn.value.steps
    const finishReason = await turn.value.finishReason

    logger.debug('evidence_turn_payload_observed', {
      runId,
      disputeCaseId: args.disputeCaseId,
      productId: this.name,
      finishReason,
      stepCount: steps.length,
    })

    // Fallback: agent hit the step cap without calling completeEvidenceCollection.
    // Fire the command with the same idempotency key the tool uses so the bus
    // dedupes if the agent also called it.
    const completionCalled = steps.some((s) =>
      s.toolCalls.some((tc) => tc.toolName === 'completeEvidenceCollection'),
    )
    if (!completionCalled) {
      logger.warn('evidence_collection_hit_step_cap', {
        runId,
        disputeCaseId: args.disputeCaseId,
        productId: this.name,
      })
      const complete = await this.deps.services
        .messageBus()
        .handle(
          createCommand(
            'CompleteDisputeEvidenceCollection',
            { disputeCaseId: args.disputeCaseId },
            `agent:${this.name}:collect-evidence:${args.disputeCaseId}:complete`,
          ),
        )
      if (complete.isErr()) {
        logger.error('evidence_collection_fallback_complete_failed', {
          error: complete.error,
          runId,
          disputeCaseId: args.disputeCaseId,
          productId: this.name,
        })
      }
    }
  }

  private broadcastJson(payload: Record<string, unknown>): void {
    this.broadcast(JSON.stringify(payload))
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
          serverUrl: server.server_url,
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
   * Debounced PG-reconciliation trigger. Each MCP transition schedules one
   * idempotent `sendMcpSyncPing` callback; a burst collapses to a single pending
   * callback (the Agents SDK scheduler IS the intent outbox — durable in SQLite).
   */
  private async scheduleMcpStateSync(): Promise<void> {
    await this.schedule(MCP_SYNC_PING_DEBOUNCE_SECONDS, SEND_MCP_SYNC_PING_CALLBACK, undefined, {
      idempotent: true,
    })
  }

  /**
   * Scheduled drain: emits the payload-poor `McpStateChanged` integration event so
   * a worker handler re-reads live MCP truth and reconciles
   * `product_app_data_sources`. Throws on send failure so the scheduler retries.
   */
  async sendMcpSyncPing(): Promise<void> {
    const sent = await this.deps.services
      .queueClient()
      .send(createEvent('McpStateChanged', { productId: this.name }))
    if (sent.isErr()) throw sent.error
  }

  /**
   * RPC snapshot of the agent's MCP servers for PG reconciliation: each server's
   * id and its SDK-reported connection state. The handler interprets the state.
   */
  async listMcpServers(): Promise<Array<{ mcpServerId: string; serverState: McpConnectionState }>> {
    return Object.entries(this.getMcpServers().servers).map(([mcpServerId, server]) => ({
      mcpServerId,
      serverState: server.state,
    }))
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
    // No refresh here: see signalMcpConnected.
  }

  /**
   * Composite disconnect entry point called by the application layer (the
   * `disconnectProductAppDataSource` server fn) and by {@link clearMcpServers}
   * during restart. DO-first, by design (§9 MCP mapping / MCP-1):
   *
   * 1. clear DO MCP state (SDK broadcasts `CF_AGENT_MCP_SERVERS` to the FE) — the
   *    capability dies first, so any later follower failure leaves only a stale
   *    PG row, never a live MCP an unauthorized agent could still call
   * 2. synthesize a "disconnected" user turn so the agent stops trying tools
   *    from the now-removed server on its next stream
   * 3. durably hand off PG cleanup: schedule the {@link drainMcpDisconnect}
   *    drain (the Agents SDK scheduler IS the intent outbox — SQLite-persisted,
   *    alarm-driven, retried), replacing the old logged-and-lost dispatch
   *
   * No-op (`false`) if the server is already gone. Missing `userId` logs and
   * still completes DO cleanup; PG cleanup is skipped (no owner to attribute it
   * to) — only reachable on the restart path, where the row is torn down anyway.
   */
  async disconnectMcp(mcpServerId: string): Promise<boolean> {
    const server = this.getMcpServers().servers[mcpServerId]
    if (!server) return false

    await this.removeMcpServer(mcpServerId)
    await this.mcpOAuth.removeTokenExpiry(mcpServerId)
    await this.signalMcpDisconnected(server.name)

    if (!this.userId) {
      logger.error('disconnect_mcp_missing_userid', { productId: this.name, mcpServerId })
      return true
    }

    await this.schedule<McpDisconnectIntent>(0, DRAIN_MCP_DISCONNECT_CALLBACK, {
      mcpServerId,
      userId: this.userId,
    })

    return true
  }

  /**
   * Scheduled drain for the PG-cleanup half of a user MCP disconnect. The live
   * session is already gone (see {@link disconnectMcp}); this dispatches the
   * `DisconnectProductAppDataSource` command onto the queue with a deterministic
   * id, so the command's own claim dedupes retries/redelivery and the delete is
   * idempotent on a missing row. Throws on send failure so the scheduler retries.
   */
  async drainMcpDisconnect({ mcpServerId, userId }: McpDisconnectIntent): Promise<void> {
    const sent = await this.deps.services
      .queueClient()
      .send(
        createCommand(
          'DisconnectProductAppDataSource',
          { userId, productId: this.name, mcpServerId },
          `disconnect-mcp:${this.name}:${mcpServerId}`,
        ),
      )
    if (sent.isErr()) throw sent.error
  }

  async scheduleNextMcpOAuthRefresh(): Promise<void> {
    const schedules = await this.listSchedules({ type: 'scheduled' })
    for (const s of schedules) {
      if (s.callback === REFRESH_MCP_OAUTH_TOKENS_CALLBACK) {
        await this.cancelSchedule(s.id)
      }
    }

    const nextAt = await this.mcpOAuth.computeNextRefreshAt()
    if (nextAt) {
      await this.schedule(nextAt, REFRESH_MCP_OAUTH_TOKENS_CALLBACK, undefined, {
        idempotent: true,
      })
    }
  }

  async refreshMcpOauthTokens(): Promise<void> {
    try {
      await this.mcpOAuth.refreshDueTokens()
    } finally {
      await this.scheduleNextMcpOAuthRefresh()
    }
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
