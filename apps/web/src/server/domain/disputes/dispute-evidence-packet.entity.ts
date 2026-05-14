import {
  DISPUTE_REASON_WORKFLOW,
  ValidationError,
  createEvent,
  stripeDisputeReasonSchema,
} from '@riposte/core'
import type {
  StripeDisputeEvidenceProductType,
  StripeDisputeReasonCodeCategory,
  UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import { Result } from 'better-result'

import type { DisputeCase, DisputeCaseId } from './dispute-case.entity'
import { buildEvidencePdfDocument } from './dispute-evidence-packet-template.service'
import type { DisputeEvidencePdfDocument } from './dispute-evidence-packet-template.service'
import type { StripeDisputeContext } from './stripe-dispute-context.entity'

export type EvidencePdfArtifact = {
  kind: 'evidence_pdf'
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  stripeEvidenceField: 'uncategorized_file'
  r2Key: string
  contentType: 'application/pdf'
}

export type DisputeEvidencePacketArtifact = EvidencePdfArtifact

export type FraudDigitalStripeEvidencePayload = {
  customer_purchase_ip: string | null
  customer_name: string | null
  customer_email_address: string | null
  access_activity_log: string | null
  uncategorized_text: string | null
  service_documentation: null
}

export type EvidenceQuality = 'low' | 'medium' | 'high'

export type CollectedDisputeEvidence = {
  accessActivityLog: string | null
  merchantPosition: string | null
}

export type DisputeEvidencePacketSnapshot = {
  id: UUIDv4
  userId: UUIDv4
  disputeCaseId: DisputeCaseId
  version: number
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload
  pdfDocument: DisputeEvidencePdfDocument
  artifacts: DisputeEvidencePacketArtifact[]
  evidenceQuality: EvidenceQuality
  createdAt: Date
}

export type CreateDisputeEvidencePacketInput = {
  disputeCase: DisputeCase
  disputeContext: StripeDisputeContext
  collectedEvidence?: Partial<CollectedDisputeEvidence>
  previousPacket: DisputeEvidencePacket | null
}

export class DisputeEvidencePacket extends Entity<DisputeEvidencePacketSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly userId: UUIDv4,
    readonly disputeCaseId: DisputeCaseId,
    readonly version: number,
    readonly reasonCodeCategory: StripeDisputeReasonCodeCategory,
    readonly productType: StripeDisputeEvidenceProductType,
    readonly stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
    readonly pdfDocument: DisputeEvidencePdfDocument,
    readonly artifacts: DisputeEvidencePacketArtifact[],
    readonly evidenceQuality: EvidenceQuality,
    readonly createdAt: Date,
  ) {
    super()
  }

  static create(
    input: CreateDisputeEvidencePacketInput,
  ): Result<DisputeEvidencePacket, ValidationError> {
    const version = input.previousPacket ? input.previousPacket.version + 1 : 1
    const id = crypto.randomUUID() as UUIDv4
    const createdAt = new Date()
    const caseSnapshot = input.disputeCase.serialize()
    const evidencePacketSupport = resolveSupportedEvidencePacket(caseSnapshot.reason)
    if (evidencePacketSupport.isErr()) return Result.err(evidencePacketSupport.error)
    const { productType, reasonCodeCategory } = evidencePacketSupport.value

    const stripeEvidencePayload = buildFraudDigitalStripeEvidencePayload(input)
    const pdfDocument = buildEvidencePdfDocument({
      reasonCodeCategory,
      productType,
      disputeCase: input.disputeCase,
      disputeContext: input.disputeContext,
      stripeEvidencePayload,
    })
    if (pdfDocument.isErr()) return Result.err(pdfDocument.error)
    const artifacts = buildFraudEvidencePacketArtifacts(
      input.disputeCase,
      reasonCodeCategory,
      productType,
      version,
      id,
    )
    const evidenceQuality = assessEvidenceQuality(stripeEvidencePayload, input.disputeContext)

    const packet = new DisputeEvidencePacket(
      id,
      input.disputeCase.userId,
      input.disputeCase.id,
      version,
      reasonCodeCategory,
      productType,
      stripeEvidencePayload,
      pdfDocument.value,
      artifacts,
      evidenceQuality,
      createdAt,
    )

    packet.addEvent(
      createEvent('DisputeEvidencePacketCreated', {
        disputeEvidencePacketId: packet.id,
        disputeCaseId: packet.disputeCaseId,
        userId: packet.userId,
        version: packet.version,
        reasonCodeCategory: packet.reasonCodeCategory,
        productType: packet.productType,
      }),
    )

    return Result.ok(packet)
  }

  static deserialize(snapshot: DisputeEvidencePacketSnapshot): DisputeEvidencePacket {
    return new DisputeEvidencePacket(
      snapshot.id,
      snapshot.userId,
      snapshot.disputeCaseId,
      requirePositiveInteger(snapshot.version, 'version'),
      snapshot.reasonCodeCategory,
      snapshot.productType,
      snapshot.stripeEvidencePayload,
      snapshot.pdfDocument,
      snapshot.artifacts.map((artifact) => ({ ...artifact })),
      snapshot.evidenceQuality,
      snapshot.createdAt,
    )
  }

  serialize(): DisputeEvidencePacketSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      disputeCaseId: this.disputeCaseId,
      version: this.version,
      reasonCodeCategory: this.reasonCodeCategory,
      productType: this.productType,
      stripeEvidencePayload: this.stripeEvidencePayload,
      pdfDocument: this.pdfDocument,
      artifacts: this.artifacts.map((artifact) => ({ ...artifact })),
      evidenceQuality: this.evidenceQuality,
      createdAt: this.createdAt,
    }
  }
}

function requirePositiveInteger(value: number, path: string): number {
  if (Number.isInteger(value) && value > 0) return value

  throw new Error(`${path} must be a positive integer`)
}

function resolveSupportedEvidencePacket(reason: string): Result<
  {
    reasonCodeCategory: StripeDisputeReasonCodeCategory
    productType: StripeDisputeEvidenceProductType
  },
  ValidationError
> {
  const parsedReason = stripeDisputeReasonSchema.safeParse(reason)
  if (!parsedReason.success) {
    return Result.err(
      createEvidencePacketValidationError(
        'unsupported_stripe_dispute_reason',
        `Unsupported Stripe dispute reason for evidence packet: ${reason}`,
      ),
    )
  }

  const workflow = DISPUTE_REASON_WORKFLOW[parsedReason.data]
  if (workflow.evidencePacket.supported) {
    return Result.ok({
      reasonCodeCategory: workflow.evidencePacket.reasonCodeCategory,
      productType: workflow.evidencePacket.productType,
    })
  }

  return Result.err(
    createEvidencePacketValidationError(
      workflow.evidencePacket.code,
      `Evidence packet is not supported for Stripe dispute reason: ${reason}`,
    ),
  )
}

function createEvidencePacketValidationError(code: string, message: string): ValidationError {
  return new ValidationError({
    message,
    issues: [
      {
        code,
        path: ['reason'],
        message,
      },
    ],
  })
}

function buildFraudDigitalStripeEvidencePayload(
  input: CreateDisputeEvidencePacketInput,
): FraudDigitalStripeEvidencePayload {
  const caseSnapshot = input.disputeCase.serialize()
  const customerName =
    stripeEvidenceString(caseSnapshot.evidence.customer_name) ??
    input.disputeContext.customer?.name ??
    null
  const customerEmail =
    stripeEvidenceString(caseSnapshot.evidence.customer_email_address) ??
    input.disputeContext.customer?.email ??
    null

  return {
    customer_purchase_ip: caseSnapshot.customerPurchaseIp,
    customer_name: customerName,
    customer_email_address: customerEmail,
    access_activity_log: nonEmptyString(input.collectedEvidence?.accessActivityLog),
    uncategorized_text: nonEmptyString(input.collectedEvidence?.merchantPosition),
    service_documentation: null,
  }
}

function buildFraudEvidencePacketArtifacts(
  disputeCase: DisputeCase,
  reasonCodeCategory: StripeDisputeReasonCodeCategory,
  productType: StripeDisputeEvidenceProductType,
  version: number,
  packetId: UUIDv4,
): DisputeEvidencePacketArtifact[] {
  return [
    buildFraudEvidencePdfArtifact(disputeCase, reasonCodeCategory, productType, version, packetId),
  ]
}

function buildFraudEvidencePdfArtifact(
  disputeCase: DisputeCase,
  reasonCodeCategory: StripeDisputeReasonCodeCategory,
  productType: StripeDisputeEvidenceProductType,
  version: number,
  packetId: UUIDv4,
): EvidencePdfArtifact {
  return {
    kind: 'evidence_pdf',
    reasonCodeCategory,
    productType,
    stripeEvidenceField: 'uncategorized_file',
    r2Key: buildFraudEvidencePdfR2Key(disputeCase.userId, disputeCase.id, version, packetId),
    contentType: 'application/pdf',
  }
}

function assessEvidenceQuality(
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
  _context: StripeDisputeContext,
): EvidenceQuality {
  if (!stripeEvidencePayload.access_activity_log || !stripeEvidencePayload.uncategorized_text) {
    return 'low'
  }

  return 'medium'
}

function buildFraudEvidencePdfR2Key(
  userId: UUIDv4,
  disputeCaseId: string,
  version: number,
  packetId: UUIDv4,
): string {
  return `users/${userId}/disputes/${disputeCaseId}/evidence-packets/v${version}/${packetId}/fraud-evidence.pdf`
}

function stripeEvidenceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function nonEmptyString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}
