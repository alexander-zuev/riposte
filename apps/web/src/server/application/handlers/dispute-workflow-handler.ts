import type {
  BlobStorageError,
  CollectDisputeEvidence,
  DatabaseError,
  DisputeCaseReceived,
  EnrichDisputeContext,
  EvidencePdfRenderError,
  GenerateEvidencePacket,
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
import type { DisputeCase, DisputeCaseEvaluation, EvidenceQuality } from '@server/domain/disputes'
import { renderDisputeEvidencePdf } from '@server/infrastructure/pdf/dispute-evidence-pdf-renderer'
import type { GetClientError } from '@server/infrastructure/stripe/stripe-client-provider'
import { fetchStripeDisputeContext } from '@server/infrastructure/stripe/stripe-dispute-enrichment'
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
export type CollectDisputeEvidenceResult =
  { action: 'collected' }

export type GenerateEvidencePacketResult =
  { action: 'generated'; evidencePacketId: string; quality: EvidenceQuality }

export type RouteDisputeSubmissionPolicyResult =
  | { route: 'submit'; evidencePacketId: string }
  | { route: 'await_human'; requestKind: 'submission_approval'; evidencePacketId: string }

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

  // TODO(submission-policy): Replace this first-pass quality gate with an explicit
  // policy object that can account for merchant approval settings, dispute amount,
  // evidence completeness, agent confidence, and category-specific submission rules.
  if (evidencePacket.evidenceQuality === 'high') {
    logger.info('dispute_submission_policy_auto_submit', {
      disputeCaseId: command.disputeCaseId,
      evidencePacketId: command.evidencePacketId,
      evidenceQuality: evidencePacket.evidenceQuality,
    })

    return Result.ok({ route: 'submit', evidencePacketId: command.evidencePacketId })
  }

  // TODO(submission-policy): Replace this rough stop with a policy service that evaluates
  // user-defined mode (autopilot/manual review), dispute facts, and evidence facts, then
  // returns a first-class route such as submit, requireApproval, accept, or noResponse.
  disputeCase.awaitSubmissionApproval({
    evidencePacketId: evidencePacket.id,
    evidenceQuality: evidencePacket.evidenceQuality,
  })

  const saved = await deps.repos.disputeCases(tx).save(disputeCase)
  if (saved.isErr()) return Result.err(saved.error)

  logger.info('dispute_submission_policy_review_required', {
    disputeCaseId: command.disputeCaseId,
    evidencePacketId: command.evidencePacketId,
    evidenceQuality: evidencePacket.evidenceQuality,
  })

  return Result.ok({
    route: 'await_human',
    requestKind: 'submission_approval',
    evidencePacketId: command.evidencePacketId,
  })
}

export async function submitDisputeResponse(
  command: SubmitDisputeResponse,
  { deps, tx }: HandlerContext,
): Promise<Result<SubmitDisputeResponseResult, DisputeWorkflowCommandError>> {
  const found = await deps.repos.disputeCases(tx).findById(command.disputeCaseId)
  if (found.isErr()) return Result.err(found.error)

  if (!found.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: command.disputeCaseId }))
  }

  const canSubmit = validateDisputeCanBeSubmitted(found.value)
  if (canSubmit.isErr()) return Result.err(canSubmit.error)

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

  // TODO: 1) didn't we previously validate? And this repeats the submission policy? do we not trust it?
  if (packet.value.evidenceQuality !== 'high') {
    return Result.err(
      validationError(
        'approval_required',
        ['evidenceQuality'],
        `Cannot auto-submit ${packet.value.evidenceQuality} quality evidence without merchant approval`,
      ),
    )
  }
  // OK for now so we have to go through artifacts to retrieve them one by one
  const pdfArtifact = packet.value.artifacts.find((artifact) => artifact.kind === 'evidence_pdf')
  if (!pdfArtifact) {
    return Result.err(
      validationError('missing_required', ['artifacts'], 'Evidence packet PDF artifact is missing'),
    )
  }

  const blob = await deps.repos.disputeEvidenceArtifactBlobs().get({ r2Key: pdfArtifact.r2Key })
  if (blob.isErr()) return Result.err(blob.error)

  if (!blob.value) {
    return Result.err(
      new EntityNotFoundError({
        entity: 'DisputeEvidenceArtifactBlob',
        id: pdfArtifact.r2Key,
      }),
    )
  }

  const stripe = await deps.services
    .stripeClientProvider()
    .getForAccount(found.value.stripeAccountId)
  if (stripe.isErr()) return Result.err(stripe.error)

  const submitted = await submitStripeDisputeEvidence({
    stripe: stripe.value,
    disputeCase: found.value,
    packet: packet.value,
    artifactBlobs: [{ artifact: pdfArtifact, blob: blob.value }],
  })
  if (submitted.isErr()) return Result.err(submitted.error)

  const refreshed = found.value.refreshStripeDisputeFacts(submitted.value.stripeDispute)
  if (refreshed.isErr()) return Result.err(refreshed.error)

  found.value.complete('contest_submitted')
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

function validateDisputeCanBeSubmitted(
  disputeCase: DisputeCase,
): Result<void, ValidationErrorType> {
  const snapshot = disputeCase.serialize()

  if (!['needs_response', 'warning_needs_response'].includes(snapshot.stripeStatus)) {
    return Result.err(
      validationError(
        'invalid_state',
        ['stripeStatus'],
        `Cannot submit evidence when Stripe dispute status is ${snapshot.stripeStatus}`,
      ),
    )
  }

  if (!snapshot.evidenceDetailsDueBy) {
    return Result.err(
      validationError(
        'missing_required',
        ['evidenceDetailsDueBy'],
        'Cannot submit evidence without a Stripe evidence deadline',
      ),
    )
  }

  if (snapshot.evidenceDetailsPastDue || snapshot.evidenceDetailsDueBy.getTime() <= Date.now()) {
    return Result.err(
      validationError(
        'deadline_past',
        ['evidenceDetailsDueBy'],
        'Cannot submit evidence after the Stripe evidence deadline',
      ),
    )
  }

  if (snapshot.evidenceDetailsSubmissionCount > 0) {
    return Result.err(
      validationError(
        'already_submitted',
        ['evidenceDetailsSubmissionCount'],
        'Cannot submit evidence because Stripe already records an evidence submission',
      ),
    )
  }

  return Result.ok(undefined)
}

function validationError(code: string, path: Array<string | number>, message: string) {
  return new ValidationError({
    message,
    issues: [{ code, path, message }],
  })
}
