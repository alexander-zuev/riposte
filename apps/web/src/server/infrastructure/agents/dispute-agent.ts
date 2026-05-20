import { AIChatAgent, type OnChatMessageOptions } from '@cloudflare/ai-chat'
import { createLogger, createSentryOptions, type UserId } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { createDisputeAgentModel } from '@server/infrastructure/ai/model-factory'
import type { IAnalyticsService } from '@server/infrastructure/analytics/analytics-service'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import {
  convertToModelMessages,
  type StreamTextOnFinishCallback,
  ToolLoopAgent,
  type ToolSet,
  type UIMessage,
} from 'ai'

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

// TODO(agent): derive from playbook + setup context once available.
const DISPUTE_AGENT_INSTRUCTIONS = [
  'You are Riposte, an AI agent that defends merchants against Stripe payment disputes.',
  'You operate inside a per-product chat. Be concise, direct, and action-oriented.',
  'Ask one clarifying question at a time when information is missing.',
  'Never promise dispute outcomes you cannot guarantee.',
].join(' ')

class DisputeAgentBase extends AIChatAgent<Env, DisputeAgentState, DisputeAgentProps> {
  private readonly deps: AppDeps
  private readonly analytics: IAnalyticsService

  initialState: DisputeAgentState = { mode: 'setup' }

  private userId?: UserId

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.deps = createAppDeps(env, state)
    this.analytics = this.deps.services.analytics()
  }

  async onStart(props?: DisputeAgentProps): Promise<void> {
    if (props?.userId) {
      await this.ctx.storage.put(USER_ID_STORAGE_KEY, props.userId)
      this.userId = props.userId
      return
    }
    this.userId = await this.ctx.storage.get<UserId>(USER_ID_STORAGE_KEY)
  }

  // TODO:
  // When / how do we thread in the Setup State updates -> on chat message or between message parts / inside the turn?
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

    // TODO(agent): register dispute tools (read disputes, fetch product context,
    // submit evidence, etc.) as `tools` here. ToolLoopAgent runs the LLM ↔ tool
    // loop until the model finishes without tool calls. Add a wall-clock-based
    // `stopWhen` (not step count) when tools are registered — see spec bounds.
    const agent = new ToolLoopAgent({
      id: 'dispute-agent',
      model,
      instructions: DISPUTE_AGENT_INSTRUCTIONS,
    })

    const result = await agent.stream({
      messages: await convertToModelMessages(this.messages),
    })

    return result.toUIMessageStreamResponse()
  }

  /** RPC seed for the agent page — WS doesn't replay history on connect. */
  async getMessages(): Promise<UIMessage[]> {
    return this.messages
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

export type DisputeAgent = DisputeAgentBase

export const DisputeAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentBase,
)
