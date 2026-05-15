import type {
  BlobStorageError,
  CollectDisputeEvidence,
  DatabaseError,
  DeclineDisputeSubmission,
  DisputeCaseReceived,
  EnrichDisputeContext,
  EvidencePdfRenderError,
  GenerateEvidencePacket,
  ReplaceDisputeEvidencePacket,
  RouteDisputeSubmissionPolicy,
  StripeApiError,
  SubmitDisputeResponse,
  TriageDisputeCase,
  WorkflowError,
  ValidationError as ValidationErrorType,
} from '@riposte/core'
import { createLogger, EntityNotFoundError, ValidationError } from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { DisputeEvidencePacket, StripeDisputeContext } from '@server/domain/disputes'
import type {
  DisputeCaseEvaluation,
  DisputeEvidencePacketArtifact,
  EvidenceQuality,
} from '@server/domain/disputes'
import type { DisputeEvidenceArtifactBlobBody } from '@server/domain/repository/interfaces'
import { renderDisputeEvidencePdf } from '@server/infrastructure/pdf/dispute-evidence-pdf-renderer'
import type { GetClientError } from '@server/infrastructure/stripe/stripe-client-provider'
import {
  fetchStripeDispute,
  fetchStripeDisputeContext,
} from '@server/infrastructure/stripe/stripe-dispute-enrichment'
import { submitStripeDisputeEvidence } from '@server/infrastructure/stripe/stripe-dispute-submission'
import { Result } from 'better-result'

const logger = createLogger('dispute-workflow-handler')

type DisputeAgentWorkflowHandlerError = WorkflowError
type DisputeWorkflowCommandError =
  | DatabaseError
  | EntityNotFoundError
  | GetClientError
  | ValidationErrorType
  | EvidencePdfRenderError
  | BlobStorageError
  | StripeApiError

// Temporary post-evaluation workflow contracts. Keep the action shape stable as
// evidence collection, packet generation, policy routing, and submission become real.
export type CollectDisputeEvidenceResult = { action: 'collected' }

export type GenerateEvidencePacketResult = {
  action: 'generated'
  evidencePacketId: string
  quality: EvidenceQuality
}

export type RouteDisputeSubmissionPolicyResult =
  | { route: 'submit'; evidencePacketId: string }
  | { route: 'await_human'; requestKind: 'submission_approval'; evidencePacketId: string }

export type SubmitDisputeResponseResult = {
  action: 'submitted'
}

export type DeclineDisputeSubmissionResult = {
  action: 'declined'
}

export type ReplaceDisputeEvidencePacketResult = {
  action: 'replaced'
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
    reason: decision.code,
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

  const disputeContext = StripeDisputeContext.create(context.value.context)
  const savedContext = await deps.repos.stripeDisputeContexts(tx).save(disputeContext)
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
  { deps, tx }: HandlerContext,
): Promise<Result<GenerateEvidencePacketResult, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  const context = await deps.repos
    .stripeDisputeContexts(tx)
    .findByDisputeCaseId(command.disputeCaseId)
  if (context.isErr()) return Result.err(context.error)

  if (!context.value) {
    return Result.err(
      new EntityNotFoundError({
        entity: 'StripeDisputeContext',
        id: command.disputeCaseId,
      }),
    )
  }

  const latest = await deps.repos.disputeEvidencePackets(tx).findLatestByDisputeCaseId({
    userId: found.value.userId,
    disputeCaseId: command.disputeCaseId,
  })
  if (latest.isErr()) return Result.err(latest.error)

  const packet = DisputeEvidencePacket.create({
    disputeCase: found.value,
    disputeContext: context.value,
    previousPacket: latest.value,
  })
  if (packet.isErr()) return Result.err(packet.error)

  const stripeConnection = await deps.repos
    .stripeConnections(tx)
    .findByStripeAccountId(found.value.stripeAccountId)
  if (stripeConnection.isErr()) return Result.err(stripeConnection.error)

  const renderedPdf = await renderDisputeEvidencePdf({
    document: packet.value.pdfDocument,
    branding: {
      merchantName: stripeConnection.value?.stripeBusinessName ?? found.value.stripeAccountId,
    },
    generatedAt: packet.value.createdAt,
  })
  if (renderedPdf.isErr()) return Result.err(renderedPdf.error)

  const pdfArtifact = packet.value.artifacts.find((artifact) => artifact.kind === 'evidence_pdf')
  if (!pdfArtifact) {
    return Result.err(
      new ValidationError({
        message: 'Evidence packet PDF artifact is missing',
        issues: [
          {
            code: 'missing_required',
            path: ['artifacts'],
            message: 'Evidence packet PDF artifact is missing',
          },
        ],
      }),
    )
  }

  const savedBlob = await deps.repos.disputeEvidenceArtifactBlobs().save({
    r2Key: pdfArtifact.r2Key,
    bytes: renderedPdf.value,
    contentType: pdfArtifact.contentType,
  })
  if (savedBlob.isErr()) return Result.err(savedBlob.error)

  const saved = await deps.repos.disputeEvidencePackets(tx).save(packet.value)
  if (saved.isErr()) return Result.err(saved.error)

  logger.info('dispute_evidence_packet_generated', {
    disputeCaseId: found.value.id,
    evidencePacketId: saved.value.id,
    evidenceQuality: saved.value.evidenceQuality,
    version: saved.value.version,
  })

  return Result.ok({
    action: 'generated',
    evidencePacketId: saved.value.id,
    quality: saved.value.evidenceQuality,
  })
}

export async function routeDisputeSubmissionPolicy(
  command: RouteDisputeSubmissionPolicy,
  { deps, tx }: HandlerContext,
): Promise<Result<RouteDisputeSubmissionPolicyResult, DisputeWorkflowCommandError>> {
  const disputeCaseResult = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (disputeCaseResult.isErr()) return Result.err(disputeCaseResult.error)

  if (!disputeCaseResult.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }
  const disputeCase = disputeCaseResult.value

  const evidencePacketResult = await deps.repos.disputeEvidencePackets(tx).findByIdForCase({
    userId: disputeCase.userId,
    disputeCaseId: disputeCase.id,
    evidencePacketId: command.evidencePacketId,
  })
  if (evidencePacketResult.isErr()) return Result.err(evidencePacketResult.error)

  if (!evidencePacketResult.value) {
    return Result.err(
      new EntityNotFoundError({
        entity: 'DisputeEvidencePacket',
        id: command.evidencePacketId,
      }),
    )
  }
  const evidencePacket = evidencePacketResult.value

  // TODO(submission-policy): TEMPORARY FLOW TEST OVERRIDE. Revert this before real
  // autopilot: low/medium quality packets must require merchant approval or stronger
  // evidence policy instead of auto-submitting.
  logger.info('dispute_submission_policy_temporary_auto_submit', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
    evidenceQuality: evidencePacket.evidenceQuality,
  })

  return Result.ok({ route: 'submit', evidencePacketId: command.evidencePacketId })
}

/**
 * Submits the evidence packet to Stripe as the merchant's contest response.
 *
 * Flow:
 * - Load case + packet (404 if missing).
 * - Domain validation: `disputeCase.assertCanSubmitContest()` — owns the Stripe-fact guards
 *   (stripeStatus in needs_response set, deadline future, submission_count === 0) and the
 *   state-machine check. No handler-local validation.
 * - Refresh Stripe state, then re-validate. HITL can sleep up to 7 days; closes the staleness
 *   window (deadline elapsed, Dashboard already submitted, dispute already closed) before we
 *   spend file uploads + a submit call. Idempotency keys are deterministic so re-runs are safe.
 * - Retrieve artifact blobs from R2.
 * - Upload files to Stripe Files API → file IDs (idempotent via deterministic key).
 * - Call `disputes.update({ evidence, submit: true })` with text fields + file IDs
 *   (idempotent via deterministic key).
 * - Single domain transition: `disputeCase.complete({ reason: 'contest_submitted',
 *   stripeDispute, evidencePacketId, uploadedFiles })`. Internally refreshes facts from the
 *   Stripe response, records the response audit (evidencePacketId, uploadedFiles, submittedAt)
 *   on the `completed/contest_submitted` workflow state, and emits `DisputeCaseCompleted`.
 * - Save case; outbox emits `DisputeCaseCompleted`.
 *
 * Notes:
 * - File IDs live on the case response record, NOT on the packet. Packets are immutable; file
 *   IDs are response artifacts. See product-spec.md `DisputeResponse.challenge_submitted`.
 * - Quality gate is not checked here — submission policy already decided this packet is
 *   acceptable. Re-checking would duplicate `RouteDisputeSubmissionPolicy`.
 */
export async function submitDisputeResponse(
  command: SubmitDisputeResponse,
  { deps, tx }: HandlerContext,
): Promise<Result<SubmitDisputeResponseResult, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  const packet = await deps.repos.disputeEvidencePackets(tx).findByIdForCase({
    userId: found.value.userId,
    disputeCaseId: found.value.id,
    evidencePacketId: command.evidencePacketId,
  })
  if (packet.isErr()) return Result.err(packet.error)

  if (!packet.value) {
    return Result.err(
      new EntityNotFoundError({
        entity: 'DisputeEvidencePacket',
        id: command.evidencePacketId,
      }),
    )
  }

  const stripe = await deps.services
    .stripeClientProvider()
    .getForAccount(found.value.stripeAccountId)
  if (stripe.isErr()) return Result.err(stripe.error)

  const freshDispute = await fetchStripeDispute(stripe.value, found.value.id)
  if (freshDispute.isErr()) return Result.err(freshDispute.error)

  const refreshedBeforeSubmit = found.value.refreshStripeDisputeFacts(freshDispute.value)
  if (refreshedBeforeSubmit.isErr()) return Result.err(refreshedBeforeSubmit.error)

  const canSubmit = found.value.canSubmitContest()
  if (canSubmit.isErr()) return Result.err(canSubmit.error)

  const blobLookups = await Promise.all(
    packet.value.artifacts.map(async (artifact) => ({
      artifact,
      result: await deps.repos.disputeEvidenceArtifactBlobs().get({ r2Key: artifact.r2Key }),
    })),
  )

  const artifactBlobs: Array<{
    artifact: DisputeEvidencePacketArtifact
    blob: DisputeEvidenceArtifactBlobBody
  }> = []
  for (const { artifact, result } of blobLookups) {
    if (result.isErr()) return Result.err(result.error)
    if (!result.value) {
      return Result.err(
        new EntityNotFoundError({
          entity: 'DisputeEvidenceArtifactBlob',
          id: artifact.r2Key,
        }),
      )
    }
    artifactBlobs.push({ artifact, blob: result.value })
  }

  const submitted = await submitStripeDisputeEvidence({
    stripe: stripe.value,
    disputeCase: found.value,
    packet: packet.value,
    artifactBlobs,
  })
  if (submitted.isErr()) return Result.err(submitted.error)

  const completed = found.value.complete({
    reason: 'contest_submitted',
    stripeDispute: submitted.value.stripeDispute,
    evidencePacketId: command.evidencePacketId,
    uploadedFiles: submitted.value.uploadedFiles,
  })
  if (completed.isErr()) return Result.err(completed.error)

  const saved = await deps.repos.disputeCases(tx).save(found.value)
  if (saved.isErr()) return Result.err(saved.error)

  logger.info('dispute_response_submitted', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
    uploadedFiles: submitted.value.uploadedFiles.map((file) => ({
      artifactKind: file.artifactKind,
      stripeEvidenceField: file.stripeEvidenceField,
      fileId: file.fileId,
    })),
  })

  return Result.ok({ action: 'submitted' })
}

// TODO(hitl): Record decline on DisputeCase, complete as no_response.
export async function declineDisputeSubmission(
  command: DeclineDisputeSubmission,
  { deps, tx }: HandlerContext,
): Promise<Result<DeclineDisputeSubmissionResult, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  logger.info('dispute_submission_declined', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
  })

  return Result.ok({ action: 'declined' })
}

// TODO(hitl): Reroute submission policy for the replacement packet, then submit if allowed.
export async function replaceDisputeEvidencePacket(
  command: ReplaceDisputeEvidencePacket,
  { deps, tx }: HandlerContext,
): Promise<Result<ReplaceDisputeEvidencePacketResult, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  logger.info('dispute_evidence_packet_replacement_requested', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
    replacementEvidencePacketId: command.replacementEvidencePacketId,
  })

  return Result.ok({ action: 'replaced' })
}
