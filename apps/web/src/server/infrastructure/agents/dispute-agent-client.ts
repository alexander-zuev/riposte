import { createLogger, DOUnreachableError, WorkflowError, type UUIDv4 } from '@riposte/core'
import type { DisputeAgent } from '@server/infrastructure/agents/dispute-agent'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { getAgentByName } from 'agents'
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
          const agent = await getAgentByName(this.env.DisputeAgent, userId)

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
          const agent = await getAgentByName(this.env.DisputeAgent, userId)
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
          const agent = await getAgentByName(this.env.DisputeAgent, userId)
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
          const agent = await getAgentByName(this.env.DisputeAgent, userId)
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
}

export function disputeAgentWorkflowInstanceId(disputeCaseId: string): string {
  return `dispute-${disputeCaseId}`
}
