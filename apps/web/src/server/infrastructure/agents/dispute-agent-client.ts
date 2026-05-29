import {
  createLogger,
  DOUnreachableError,
  type DisputeAgentMessage,
  WorkflowError,
  type UUIDv4,
} from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { getAgentByName } from 'agents'
import { Result } from 'better-result'

const DISPUTE_AGENT_BINDING = 'DisputeAgent'
const DISPUTE_AGENT_WORKFLOW_BINDING = 'DISPUTE_AGENT_WORKFLOW'

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
  productId: UUIDv4
  disputeCaseId: string
}

export type SendEvidenceCollectionWorkflowEventInput = DisputeAgentWorkflowInput & {
  outcome: 'completed' | 'needs_input'
}

export type StartEvidenceCollectionInput = DisputeAgentWorkflowInput & {
  workflowInstanceId: string
}

export type StartEvidenceCollectionResult = {
  fiberId: string
}

export type PrimeProductSetupInput = {
  userId: UUIDv4
  productId: UUIDv4
  productName: string
  connectStripeUrl: string
}

export type GetMessagesInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export type SignalStripeConnectedInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export type DisconnectMcpInput = {
  userId: UUIDv4
  productId: UUIDv4
  mcpServerId: string
}

export type RestartSetupInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export type CancelCompactionInput = {
  userId: UUIDv4
  productId: UUIDv4
}

export type SignalProductSetupChangedInput = {
  userId: UUIDv4
  productId: UUIDv4
  setupChangeId: string
}

export interface IDisputeAgentClient {
  startWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  pauseWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  resumeWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  terminateWorkflow: (input: DisputeAgentWorkflowInput) => Promise<Result<void, WorkflowError>>
  startEvidenceCollection: (
    input: StartEvidenceCollectionInput,
  ) => Promise<Result<StartEvidenceCollectionResult, DOUnreachableError>>
  sendEvidenceCollectionWorkflowEvent: (
    input: SendEvidenceCollectionWorkflowEventInput,
  ) => Promise<Result<void, WorkflowError>>
  /**
   * Saves the product setup welcome message into the per-product DisputeAgent DO so
   * the chat is populated before the merchant opens /agent. Idempotent on the DO
   * side (no-op if any messages already exist). Returns `Result.err(DOUnreachableError)`
   * if the DO RPC fails — caller decides whether to log-and-swallow or surface.
   */
  primeProductSetup: (input: PrimeProductSetupInput) => Promise<Result<void, DOUnreachableError>>
  /**
   * Reads persisted chat history from the per-product DisputeAgent DO. The
   * messages include app-owned metadata stamped by the DO before persistence.
   */
  getMessages: (
    input: GetMessagesInput,
  ) => Promise<Result<DisputeAgentMessage[], DOUnreachableError>>
  /** Drops a synthetic "Stripe connected" user message and triggers the next agent turn. */
  signalStripeConnected: (
    input: SignalStripeConnectedInput,
  ) => Promise<Result<void, DOUnreachableError>>
  /**
   * Composite disconnect entry point used by the server function backing the
   * Sources popover. The DO clears its MCP state, synthesizes a "disconnected"
   * user turn, and dispatches `DisconnectProductAppDataSource` for PG cleanup.
   * Symmetric with the register flow where the agent's tool dispatches
   * `RegisterProductAppDataSource` after `addMcpServer`.
   */
  disconnectMcp: (input: DisconnectMcpInput) => Promise<Result<void, DOUnreachableError>>
  restartSetup: (input: RestartSetupInput) => Promise<Result<void, DOUnreachableError>>
  cancelCompaction: (input: CancelCompactionInput) => Promise<Result<void, DOUnreachableError>>
  signalProductSetupChanged: (
    input: SignalProductSetupChangedInput,
  ) => Promise<Result<void, DOUnreachableError>>
}

export class DisputeAgentClient implements IDisputeAgentClient {
  constructor(private readonly env: Env) {}

  async startWorkflow({
    userId,
    productId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName(
            this.env.DisputeAgent,
            productId,
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
                productId,
                userId,
              },
            },
          )

          logger.debug('start_workflow_succeeded', { disputeCaseId, instanceId, productId, userId })
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
    productId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName(
            this.env.DisputeAgent,
            productId,
            disputeAgentOptions(userId),
          )
          await agent.pauseWorkflow(instanceId)
          logger.debug('pause_workflow_succeeded', { disputeCaseId, instanceId, productId, userId })
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
    productId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName(
            this.env.DisputeAgent,
            productId,
            disputeAgentOptions(userId),
          )
          await agent.resumeWorkflow(instanceId)
          logger.debug('resume_workflow_succeeded', {
            disputeCaseId,
            instanceId,
            productId,
            userId,
          })
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
    productId,
    disputeCaseId,
  }: DisputeAgentWorkflowInput): Promise<Result<void, WorkflowError>> {
    const instanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName(
            this.env.DisputeAgent,
            productId,
            disputeAgentOptions(userId),
          )
          await agent.terminateWorkflow(instanceId)
          logger.debug('terminate_workflow_succeeded', {
            disputeCaseId,
            instanceId,
            productId,
            userId,
          })
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

  async startEvidenceCollection({
    userId,
    productId,
    disputeCaseId,
    workflowInstanceId,
  }: StartEvidenceCollectionInput): Promise<
    Result<StartEvidenceCollectionResult, DOUnreachableError>
  > {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        const receipt = await agent.startEvidenceCollection({
          disputeCaseId,
          workflowInstanceId,
        })
        logger.debug('start_evidence_collection_succeeded', {
          disputeCaseId,
          fiberId: receipt.fiberId,
          instanceId: workflowInstanceId,
          productId,
          userId,
        })
        return receipt
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async sendEvidenceCollectionWorkflowEvent({
    userId,
    productId,
    disputeCaseId,
    outcome,
  }: SendEvidenceCollectionWorkflowEventInput): Promise<Result<void, WorkflowError>> {
    const workflowInstanceId = disputeAgentWorkflowInstanceId(disputeCaseId)

    return Result.tryPromise(
      {
        try: async () => {
          const agent = await getAgentByName(
            this.env.DisputeAgent,
            productId,
            disputeAgentOptions(userId),
          )
          await agent.sendWorkflowEvent(DISPUTE_AGENT_WORKFLOW_BINDING, workflowInstanceId, {
            type: 'dispute_evidence_collection_finished',
            payload: {
              action: outcome === 'completed' ? 'collected' : 'awaiting_human',
              disputeCaseId,
            },
          })
          logger.debug('evidence_collection_workflow_event_sent', {
            disputeCaseId,
            instanceId: workflowInstanceId,
            outcome,
            productId,
            userId,
          })
        },
        catch: (cause) =>
          new WorkflowError({
            operation: 'send_event',
            workflowName: DISPUTE_AGENT_WORKFLOW_BINDING,
            instanceId: workflowInstanceId,
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  async primeProductSetup({
    userId,
    productId,
    productName,
    connectStripeUrl,
  }: PrimeProductSetupInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        // Pass `props` so the DO's `onStart` captures `userId` on first init.
        // Without this the DO inits without userId and PostHog events ship
        // unattributed for its lifetime (see dispute-agent.ts onStart).
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.primeProductSetup({ productName, connectStripeUrl })
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async getMessages({
    userId,
    productId,
  }: GetMessagesInput): Promise<Result<DisputeAgentMessage[], DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        return agent.getMessages()
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async signalStripeConnected({
    userId,
    productId,
  }: SignalStripeConnectedInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.signalStripeConnected()
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async disconnectMcp({
    userId,
    productId,
    mcpServerId,
  }: DisconnectMcpInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.disconnectMcp(mcpServerId)
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async restartSetup({
    userId,
    productId,
  }: RestartSetupInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        const result = await agent.restartSetup()
        if (!result.ok) {
          throw new Error(result.error)
        }
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async cancelCompaction({
    userId,
    productId,
  }: CancelCompactionInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.cancelCompaction()
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }

  async signalProductSetupChanged({
    userId,
    productId,
    setupChangeId,
  }: SignalProductSetupChangedInput): Promise<Result<void, DOUnreachableError>> {
    return Result.tryPromise({
      try: async () => {
        const agent = await getAgentByName(
          this.env.DisputeAgent,
          productId,
          disputeAgentOptions(userId),
        )
        await agent.signalProductSetupChanged(setupChangeId)
      },
      catch: (cause) => new DOUnreachableError({ cause, retryable: isTransientError(cause) }),
    })
  }
}

export function disputeAgentWorkflowInstanceId(disputeCaseId: string): string {
  return `dispute-${disputeCaseId}`
}
