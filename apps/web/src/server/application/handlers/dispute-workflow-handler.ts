import type { DisputeCaseReceived, WorkflowError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { Result } from 'better-result'

const logger = createLogger('dispute-workflow-handler')

type DisputeAgentWorkflowHandlerError = WorkflowError

export async function startDisputeAgentWorkflow(
  event: DisputeCaseReceived,
  { deps }: HandlerContext,
): Promise<Result<void, DisputeAgentWorkflowHandlerError>> {
  const started = await deps.services.disputeAgentClient().startWorkflow({
    disputeCaseId: event.disputeCaseId,
    userId: event.userId,
  })
  if (started.isErr()) return Result.err(started.error)

  logger.info('dispute_agent_workflow_queued', {
    disputeCaseId: event.disputeCaseId,
    eventId: event.id,
  })

  return Result.ok(undefined)
}
