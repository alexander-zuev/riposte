import { createLogger, DOUnreachableError, WorkflowError, type UUIDv4 } from '@riposte/core'
import type { DisputeAgent, DisputeAgentProps } from '@server/infrastructure/agents/dispute-agent'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { getAgentByName } from 'agents'
import type { UIMessage } from 'ai'
import { Result } from 'better-result'

type EnvBindingName<TBinding> = {
  [TKey in keyof Env]: Env[TKey] extends TBinding ? TKey : never
}[keyof Env] &
  string

type DisputeAgentWorkflowBindingName = EnvBindingName<Workflow<DisputeAgentWorkflowParams>>
type DisputeAgentBindingName = EnvBindingName<DurableObjectNamespace<DisputeAgent>>

const DISPUTE_AGENT_BINDING = 'DisputeAgent' satisfies DisputeAgentBindingName
const DISPUTE_AGENT_WORKFLOW_BINDING =
  'DISPUTE_AGENT_WORKFLOW' satisfies DisputeAgentWorkflowBindingName

/** Build `getAgentByName` options. `props` is required so the DO's `onStart`
 * captures `userId` on first init — see `dispute-agent.ts`. `routingRetry`
 * handles transient DO routing blips; overloaded errors are skipped by the SDK. */
function disputeAgentOptions(userId: UUIDv4) {
  return {
    routingRetry: { maxAttempts: 3 },
    props: { userId },
  }
}

const logger = createLogger('dispute-agent-client')

export type DisputeAgentWorkflowParams = {
  disputeCaseId: string
}

export type DisputeAgentWorkflowInput = {
  userId: string
  disputeCaseId: string
}

export type GetProductMcpStatusInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export type ProductMcpStatus = {
  firstConnectedAt: Date | null
}

export type PrimeOnboardingInput = {
  userId: UUIDv4
  productId: UUIDv4
  productName: string
}

export type GetMessagesInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export interface IDisputeAgentClient {
  startWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  pauseWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  resumeWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  terminateWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  /**
   * Reads MCP server registrations from the per-product DisputeAgent DO storage and
   * returns the earliest save-timestamp. Source of truth per dispute-agent-spec.md
   * (MCP state lives in DO storage, not a PG table).
   *
   * Stubbed for MVP: returns `{ firstConnectedAt: null }` until DO MCP wiring lands.
   */
  getProductMcpStatus: (
    input: GetProductMcpStatusInput,
  ) => Promise<Result<ProductMcpStatus, DOUnreachableError>>
  /**
   * Saves the onboarding welcome message into the per-product DisputeAgent DO so
   * the chat is populated before the merchant opens /agent. Idempotent on the DO
   * side (no-op if any messages already exist). Returns `Result.err(DOUnreachableError)`
   * if the DO RPC fails — caller decides whether to log-and-swallow or surface.
   */
  primeOnboarding: (input: PrimeOnboardingInput) => Promise<Result<void, DOUnreachableError>>
  /**
   * Reads persisted chat history from the per-product DisputeAgent DO. The
   * `UIMessage<never>` specialization is our application-layer claim that no
   * one writes `metadata` — keeps the wire payload statically serializable
   * (the SDK's default `UIMessage<unknown>` would fail TanStack Start's
   * validator). Widen the generic when we start attaching metadata.
   */
  getMessages: (input: GetMessagesInput) => Promise<Result<UIMessage<never>[], DOUnreachableError>>
}

export class DisputeAgentClient implements IDisputeAgentClient {
  constructor(private readonly env: Env) {}

  async startWorkflow({
    userId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
            this.env.DisputeAgent,
            userId,
            disputeAgentOptions(userId),
          )

          await agent.runWorkflow(
            DISPUTE_AGENT_WORKFLOW_BINDING,
            { disputeCaseId } satisfies DisputeAgentWorkflowParams,
            {
              id: instanceId,
              agentBinding: DISPUTE_AGENT_BINDING,
              metadata: {
                disputeCaseId,
                userId,
              },
            },
          )

          logger.debug('start_workflow_succeeded', { disputeCaseId, instanceId, userId })
        },
        catch: (cause) =>
          new WorkflowError({
            operation: 'start',
            workflowName: DISPUTE_AGENT_WORKFLOW_BINDING,
            instanceId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  async pauseWorkflow({
    userId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
            this.env.DisputeAgent,
            userId,
            disputeAgentOptions(userId),
          )
          await agent.pauseWorkflow(instanceId)
          logger.debug('pause_workflow_succeeded', { disputeCaseId, instanceId, userId })
        },
        catch: (cause) =>
          new WorkflowError({
            operation: 'pause',
            workflowName: DISPUTE_AGENT_WORKFLOW_BINDING,
            instanceId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  async resumeWorkflow({
    userId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
            this.env.DisputeAgent,
            userId,
            disputeAgentOptions(userId),
          )
          await agent.resumeWorkflow(instanceId)
          logger.debug('resume_workflow_succeeded', { disputeCaseId, instanceId, userId })
        },
        catch: (cause) =>
          new WorkflowError({
            operation: 'resume',
            workflowName: DISPUTE_AGENT_WORKFLOW_BINDING,
            instanceId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  async terminateWorkflow({
    userId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
            this.env.DisputeAgent,
            userId,
            disputeAgentOptions(userId),
          )
          await agent.terminateWorkflow(instanceId)
          logger.debug('terminate_workflow_succeeded', { disputeCaseId, instanceId, userId })
        },
        catch: (cause) =>
          new WorkflowError({
            operation: 'terminate',
            workflowName: DISPUTE_AGENT_WORKFLOW_BINDING,
            instanceId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  // TODO(agent): replace stub with real DO storage read once DisputeAgent exposes MCP
  // server registrations. Spec: `cf_agents_mcp_servers` entries + save-timestamps.
  async getProductMcpStatus(
    _input: GetProductMcpStatusInput,
  ): Promise<Result<ProductMcpStatus, DOUnreachableError>> {
    return Result.ok({ firstConnectedAt: null })
  }

  async primeOnboarding({
    userId,
    productId,
    productName,
  }: PrimeOnboardingInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        // Pass `props` so the DO's `onStart` captures `userId` on first init.
        // Without this the DO inits without userId and PostHog events ship
        // unattributed for its lifetime (see dispute-agent.ts onStart).
        const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.primeOnboarding({ productId, productName })
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async getMessages({
    userId,
    productId,
  }: GetMessagesInput): Promise<Result<UIMessage<never>[], DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName<Env, DisputeAgent, DisputeAgentProps>(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        // Cast: the DO returns the SDK's `UIMessage<unknown>` but nothing in
        // this codebase writes `metadata`. See the interface docstring above.
        return agent.getMessages()
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }
}

export function disputeAgentWorkflowInstanceId(disputeCaseId: string): string {
  return `dispute-${disputeCaseId}`
}
