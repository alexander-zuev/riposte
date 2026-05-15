import type { StripeApiError } from '@riposte/core'
import type {
  DisputeCaseId,
  DisputeEvidencePacket,
  DisputeEvidencePacketArtifact,
} from '@server/domain/disputes'
import type { DisputeEvidenceArtifactBlobBody } from '@server/domain/repository/interfaces'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import type Stripe from 'stripe'

export type SubmitStripeDisputeEvidenceInput = {
  stripe: Stripe
  disputeCaseId: DisputeCaseId
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
  const uploads = await Promise.all(
    input.artifactBlobs.map((artifactBlob) =>
      uploadDisputeEvidenceFile(input.stripe, input.packet, artifactBlob),
    ),
  )

  const uploadedFiles: SubmitStripeDisputeEvidenceResult['uploadedFiles'] = []
  for (const upload of uploads) {
    if (upload.isErr()) return Result.err(upload.error)
    uploadedFiles.push(upload.value)
  }

  const evidence = input.packet.toStripeEvidenceFields(uploadedFiles)
  const submitted = await stripeRequest('disputes.update', () =>
    input.stripe.disputes.update(
      input.disputeCaseId,
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
          name: artifactBlob.artifact.fileName,
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

function fileUploadIdempotencyKey(
  packet: DisputeEvidencePacket,
  artifact: DisputeEvidencePacketArtifact,
): string {
  return `dispute-evidence-file:${packet.disputeCaseId}:${packet.id}:${artifact.kind}:${artifact.stripeEvidenceField}`
}

function disputeSubmitIdempotencyKey(packet: DisputeEvidencePacket): string {
  return `dispute-submit:${packet.disputeCaseId}:${packet.id}`
}
