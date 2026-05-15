import type { StripeApiError } from '@riposte/core'
import type {
  DisputeCase,
  DisputeEvidencePacket,
  DisputeEvidencePacketArtifact,
} from '@server/domain/disputes'
import type { DisputeEvidenceArtifactBlobBody } from '@server/domain/repository/interfaces'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import type Stripe from 'stripe'

export type SubmitStripeDisputeEvidenceInput = {
  stripe: Stripe
  disputeCase: DisputeCase
  packet: DisputeEvidencePacket
  artifactBlobs: Array<{
    artifact: DisputeEvidencePacketArtifact
    blob: DisputeEvidenceArtifactBlobBody
  }>
}

export type SubmitStripeDisputeEvidenceResult = {
  stripeDispute: Stripe.Dispute
  uploadedFiles: Array<{
    artifactKind: DisputeEvidencePacketArtifact['kind']
    stripeEvidenceField: DisputeEvidencePacketArtifact['stripeEvidenceField']
    fileId: string
  }>
}

export async function submitStripeDisputeEvidence(
  input: SubmitStripeDisputeEvidenceInput,
): Promise<Result<SubmitStripeDisputeEvidenceResult, StripeApiError>> {
  const uploadedFiles: SubmitStripeDisputeEvidenceResult['uploadedFiles'] = []

  for (const artifactBlob of input.artifactBlobs) {
    const uploaded = await uploadDisputeEvidenceFile(input.stripe, input.packet, artifactBlob)
    if (uploaded.isErr()) return Result.err(uploaded.error)
    uploadedFiles.push(uploaded.value)
  }

  const evidence = buildDisputeEvidence(input.packet, uploadedFiles)
  const submitted = await stripeRequest('disputes.update', () =>
    input.stripe.disputes.update(
      input.disputeCase.id,
      { evidence, submit: true },
      { idempotencyKey: disputeSubmitIdempotencyKey(input.packet) },
    ),
  )
  if (submitted.isErr()) return Result.err(submitted.error)

  return Result.ok({
    stripeDispute: submitted.value,
    uploadedFiles,
  })
}

async function uploadDisputeEvidenceFile(
  stripe: Stripe,
  packet: DisputeEvidencePacket,
  artifactBlob: {
    artifact: DisputeEvidencePacketArtifact
    blob: DisputeEvidenceArtifactBlobBody
  },
): Promise<Result<SubmitStripeDisputeEvidenceResult['uploadedFiles'][number], StripeApiError>> {
  const uploaded = await stripeRequest('files.create', () =>
    stripe.files.create(
      {
        purpose: 'dispute_evidence',
        file: {
          data: artifactBlob.blob.bytes,
          name: fileNameFromR2Key(artifactBlob.artifact.r2Key),
          type: artifactBlob.artifact.contentType,
        },
      },
      { idempotencyKey: fileUploadIdempotencyKey(packet, artifactBlob.artifact) },
    ),
  )
  if (uploaded.isErr()) return Result.err(uploaded.error)

  return Result.ok({
    artifactKind: artifactBlob.artifact.kind,
    stripeEvidenceField: artifactBlob.artifact.stripeEvidenceField,
    fileId: uploaded.value.id,
  })
}

function buildDisputeEvidence(
  packet: DisputeEvidencePacket,
  uploadedFiles: SubmitStripeDisputeEvidenceResult['uploadedFiles'],
): Stripe.DisputeUpdateParams.Evidence {
  const payload = packet.stripeEvidencePayload
  const evidence: Stripe.DisputeUpdateParams.Evidence = {}

  setIfPresent(evidence, 'product_description', payload.product_description)
  setIfPresent(evidence, 'service_date', payload.service_date)
  setIfPresent(evidence, 'billing_address', payload.billing_address)
  setIfPresent(evidence, 'customer_name', payload.customer_name)
  setIfPresent(evidence, 'customer_email_address', payload.customer_email_address)
  setIfPresent(evidence, 'customer_purchase_ip', payload.customer_purchase_ip)
  setIfPresent(evidence, 'access_activity_log', payload.access_activity_log)
  // TODO(agent:evidence_collection): When customer withdrawal is source-backed, set the
  // "Why should you win this dispute?" route in uncategorized_text and the generated PDF.
  setIfPresent(evidence, 'uncategorized_text', payload.uncategorized_text)
  setIfPresent(evidence, 'refund_policy_disclosure', payload.refund_policy_disclosure)
  setIfPresent(evidence, 'cancellation_policy_disclosure', payload.cancellation_policy_disclosure)
  setIfPresent(evidence, 'refund_refusal_explanation', payload.refund_refusal_explanation)
  setIfPresent(evidence, 'cancellation_rebuttal', payload.cancellation_rebuttal)

  // TODO(agent): Add receipt and customer_communication file artifacts only when we own those
  // source-backed artifacts and can map them to Stripe file fields.

  // TODO(visa-ce3): Add enhanced_evidence.visa_compelling_evidence_3 for Visa fraud disputes.
  // Highest-impact missing evidence — requires prior undisputed transaction history from Stripe.
  // Excluded from v1 per spec, but significantly increases win rate when eligible.

  for (const file of uploadedFiles) {
    evidence[file.stripeEvidenceField] = file.fileId
  }

  return evidence
}

function setIfPresent<K extends keyof Stripe.DisputeUpdateParams.Evidence>(
  evidence: Stripe.DisputeUpdateParams.Evidence,
  key: K,
  value: string | null,
): void {
  if (!value?.trim()) return
  evidence[key] = value as Stripe.DisputeUpdateParams.Evidence[K]
}

function fileUploadIdempotencyKey(
  packet: DisputeEvidencePacket,
  artifact: DisputeEvidencePacketArtifact,
): string {
  return `dispute-evidence-file:${packet.disputeCaseId}:${packet.id}:${artifact.kind}:${artifact.stripeEvidenceField}`
}

function disputeSubmitIdempotencyKey(packet: DisputeEvidencePacket): string {
  return `dispute-submit:${packet.disputeCaseId}:${packet.id}`
}

function fileNameFromR2Key(r2Key: string): string {
  return r2Key.split('/').at(-1) ?? 'dispute-evidence.pdf'
}
