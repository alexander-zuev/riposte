import type {
  CollectDisputeEvidence,
  DatabaseError,
  DecideDisputeSubmission,
  DisputeCaseReceived,
  EnrichDisputeContext,
  PrepareEvidencePacket,
  ReviewEvidencePacket,
  SubmitDisputeResponse,
  TriageDisputeCase,
  ValidationError,
  WorkflowError,
} from '@riposte/core'
import { createLogger, EntityNotFoundError } from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import type { DisputeCaseEvaluation } from '@server/domain/disputes'
import type { GetClientError } from '@server/infrastructure/stripe/stripe-client-provider'
import { fetchStripeDisputeContext } from '@server/infrastructure/stripe/stripe-dispute-enrichment'
import { Result } from 'better-result'

const logger = createLogger('dispute-workflow-handler')

type DisputeAgentWorkflowHandlerError = WorkflowError
type DisputeWorkflowCommandError =
  | DatabaseError
  | EntityNotFoundError
  | GetClientError
  | ValidationError

// Temporary post-evaluation workflow skeleton outputs.
// Replace these local placeholders with real domain/application contracts when
// evidence collection, packet preparation, review, and submission are implemented.
export type CollectDisputeEvidenceResult = {
  status: 'pending_agent_tools'
}

export type PrepareEvidencePacketResult = {
  status: 'pending_packet_generation'
}

export type ReviewEvidencePacketResult = {
  status: 'pending_evidence_review'
}

export type DecideDisputeSubmissionResult =
  | { action: 'submit' }
  | { action: 'ready_for_review'; reason: string }
  | { action: 'needs_input'; reason: string }
  | { action: 'no_response'; reason: string }
  | { action: 'fail'; reason: string }

export type SubmitDisputeResponseResult = {
  action: 'submitted'
}

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

export async function triageDisputeCaseHandler(
  command: TriageDisputeCase,
  { deps, tx }: HandlerContext,
): Promise<Result<DisputeCaseEvaluation, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  const decision = found.value.evaluate()

  logger.info('dispute_triage_decided', {
    action: decision.action,
    disputeCaseId: found.value.id,
    paymentMethodDetailsCardNetworkReasonCode:
      found.value.paymentMethodDetailsCardNetworkReasonCode,
    paymentMethodDetailsType: found.value.paymentMethodDetailsType,
    reason: decision.reason,
    stripeReason: found.value.reason,
  })

  const saved = await deps.repos.disputeCases(tx).save(found.value)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok(decision)
}

export async function enrichDisputeContext(
  command: EnrichDisputeContext,
  { deps, tx }: HandlerContext,
): Promise<Result<void, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  const stripe = await deps.services
    .stripeClientProvider()
    .getForAccount(found.value.stripeAccountId)
  if (stripe.isErr()) return Result.err(stripe.error)

  const context = await fetchStripeDisputeContext(stripe.value, found.value)
  if (context.isErr()) return Result.err(context.error)

  const refreshed = found.value.refreshStripeDisputeFacts(context.value.stripeDispute)
  if (refreshed.isErr()) return Result.err(refreshed.error)

  const savedContext = await deps.repos.stripeDisputeContexts(tx).save(context.value.context)
  if (savedContext.isErr()) return Result.err(savedContext.error)

  found.value.startEvidenceCollection()
  const saved = await deps.repos.disputeCases(tx).save(found.value)
  if (saved.isErr()) return Result.err(saved.error)

  logger.info('dispute_context_enriched', {
    disputeCaseId: saved.value.id,
    stripeChargeId: savedContext.value.charge.id,
    userId: saved.value.userId,
  })

  return Result.ok(undefined)
}

export async function collectDisputeEvidence(
  command: CollectDisputeEvidence,
): Promise<Result<CollectDisputeEvidenceResult, never>> {
  logger.info('dispute_evidence_collection_pending_agent_tools', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ status: 'pending_agent_tools' })
}

export async function prepareEvidencePacket(
  command: PrepareEvidencePacket,
): Promise<Result<PrepareEvidencePacketResult, never>> {
  logger.info('dispute_evidence_packet_pending_generation', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ status: 'pending_packet_generation' })
}

export async function reviewEvidencePacket(
  command: ReviewEvidencePacket,
): Promise<Result<ReviewEvidencePacketResult, never>> {
  logger.info('dispute_evidence_review_pending', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ status: 'pending_evidence_review' })
}

export async function decideDisputeSubmission(
  command: DecideDisputeSubmission,
): Promise<Result<DecideDisputeSubmissionResult, never>> {
  logger.info('dispute_submission_decision_pending_tools', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ action: 'needs_input', reason: 'agent_tools_pending' })
}

export async function submitDisputeResponse(
  command: SubmitDisputeResponse,
): Promise<Result<SubmitDisputeResponseResult, never>> {
  logger.info('dispute_response_submission_pending', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ action: 'submitted' })
}
