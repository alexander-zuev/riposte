import type {
  CollectDisputeEvidence,
  DatabaseError,
  DisputeCaseReceived,
  EnrichDisputeContext,
  GenerateEvidencePacket,
  RouteDisputeSubmissionPolicy,
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

// Temporary post-evaluation workflow contracts. Keep the action shape stable as
// evidence collection, packet generation, policy routing, and submission become real.
export type CollectDisputeEvidenceResult =
  | { action: 'collected' }
  | { action: 'await_human'; reason: string; missingEvidence: unknown[] }
  | { action: 'failed'; reason: string }

export type EvidenceQuality = 'low' | 'medium' | 'high'

export type GenerateEvidencePacketResult =
  | { action: 'generated'; evidencePacketId: string; quality: EvidenceQuality }
  | { action: 'await_human'; reason: string; evidencePacketId: string | null }
  | { action: 'failed'; reason: string }

export type RouteDisputeSubmissionPolicyResult =
  | { action: 'await_human'; reason: string; evidencePacketId: string | null }
  | { action: 'submit'; evidencePacketId: string }
  | { action: 'accept'; reason: string }
  | { action: 'no_response'; reason: string }
  | { action: 'failed'; reason: string }

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

  return Result.ok({ action: 'collected' })
}

export async function generateEvidencePacket(
  command: GenerateEvidencePacket,
): Promise<Result<GenerateEvidencePacketResult, never>> {
  logger.info('dispute_evidence_packet_pending_generation', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({
    action: 'await_human',
    reason: 'packet_generation_pending',
    evidencePacketId: null,
  })
}

export async function routeDisputeSubmissionPolicy(
  command: RouteDisputeSubmissionPolicy,
): Promise<Result<RouteDisputeSubmissionPolicyResult, never>> {
  logger.info('dispute_submission_policy_review_first', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
  })

  return Result.ok({
    action: 'await_human',
    reason: 'review_first_policy',
    evidencePacketId: command.evidencePacketId,
  })
}

export async function submitDisputeResponse(
  command: SubmitDisputeResponse,
): Promise<Result<SubmitDisputeResponseResult, never>> {
  logger.info('dispute_response_submission_pending', {
    disputeCaseId: command.disputeCaseId,
  })

  return Result.ok({ action: 'submitted' })
}
