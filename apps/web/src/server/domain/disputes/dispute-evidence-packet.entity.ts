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

export const EVIDENCE_PDF_STRIPE_EVIDENCE_FIELD = 'service_documentation' as const

export type EvidencePdfArtifact = {
  kind: 'evidence_pdf'
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  stripeEvidenceField: typeof EVIDENCE_PDF_STRIPE_EVIDENCE_FIELD
  r2Key: string
  contentType: 'application/pdf'
}

export type DisputeEvidencePacketArtifact = EvidencePdfArtifact

export type FraudDigitalStripeEvidencePayload = {
  // TODO(agent/onboarding): product_description must come from merchant-approved
  // product/service context captured during onboarding. Do not use Stripe charge.description here.
  product_description: string | null
  // Source(stripe:fallback): service_date is Stripe charge.created until an
  // agent:evidence_collection app service/access timestamp exists.
  service_date: string | null
  // Source(stripe): preserve Stripe dispute evidence billing_address when present.
  // Do not synthesize it from card country.
  billing_address: string | null
  // Source(agent/onboarding): policy disclosure text comes from merchant-approved setup context.
  refund_policy_disclosure: string | null
  // Source(agent/onboarding): policy disclosure text comes from merchant-approved setup context.
  cancellation_policy_disclosure: string | null
  // Source(agent:evidence_collection): support/refund evidence decides this field.
  refund_refusal_explanation: string | null
  // Source(agent:evidence_collection): cancellation and usage evidence decides this field.
  cancellation_rebuttal: string | null
  customer_purchase_ip: string | null
  customer_name: string | null
  customer_email_address: string | null
  // Source(agent:evidence_collection): merchant app usage/activity evidence tool.
  access_activity_log: string | null
  // Source(agent:evidence_collection): concise argument generated only from verified facts.
  uncategorized_text: string | null
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
    const artifacts = buildEvidencePacketArtifacts(
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

  // TODO(contest-rationale): Add a ContestRationale value object (rightful_cardholder |
  // cardholder_refunded | cardholder_withdrew) resolved deterministically from Stripe facts.
  // If charge.refunded or charge.amountRefunded > 0 → cardholder_refunded.
  // If merchant provides withdrawal confirmation → cardholder_withdrew (post-MVP, human input).
  // Default for fraud/unrecognized → rightful_cardholder.
  // Domain code resolves the rationale and passes it + refund/withdrawal facts to the agent as
  // structured context. The agent composes uncategorized_text using the rationale as a constraint
  // (e.g. "lead with refund proof"). Domain code validates the output.
  // See product-spec.md "Dashboard-Only Fields and Evidence Gap Notes".

  // TODO(refund-evidence): Check input.disputeContext.charge.refunded / .amountRefunded /
  // .refunds[]. If a refund exists, include refund amount, date, and refund ID in
  // uncategorized_text and the evidence PDF. Proving a prior refund is among the strongest
  // evidence for fraud disputes. The data is already on StripeDisputeContext but unused here.

  return {
    // TODO(onboarding): product_description, refund_policy_disclosure, and
    // cancellation_policy_disclosure must come from merchant-approved onboarding setup facts.
    // See product-spec.md "Required product-scoped setup facts" table.
    product_description: null,
    service_date: formatStripeServiceDate(input.disputeContext.charge.created),
    billing_address: stripeEvidenceString(caseSnapshot.evidence.billing_address),
    refund_policy_disclosure: null,
    cancellation_policy_disclosure: null,
    refund_refusal_explanation: null,
    cancellation_rebuttal: null,
    customer_purchase_ip: caseSnapshot.customerPurchaseIp,
    customer_name: customerName,
    customer_email_address: customerEmail,
    access_activity_log: nonEmptyString(input.collectedEvidence?.accessActivityLog),
    uncategorized_text: nonEmptyString(input.collectedEvidence?.merchantPosition),
  }
}

function buildEvidencePacketArtifacts(
  disputeCase: DisputeCase,
  reasonCodeCategory: StripeDisputeReasonCodeCategory,
  productType: StripeDisputeEvidenceProductType,
  version: number,
  packetId: UUIDv4,
): DisputeEvidencePacketArtifact[] {
  return [buildEvidencePdfArtifact(disputeCase, reasonCodeCategory, productType, version, packetId)]
}

function buildEvidencePdfArtifact(
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
    stripeEvidenceField: EVIDENCE_PDF_STRIPE_EVIDENCE_FIELD,
    r2Key: buildEvidencePdfR2Key(
      disputeCase.userId,
      disputeCase.id,
      reasonCodeCategory,
      productType,
      version,
      packetId,
    ),
    contentType: 'application/pdf',
  }
}

function assessEvidenceQuality(
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
  context: StripeDisputeContext,
): EvidenceQuality {
  // TODO(refund-evidence): Refund state should factor into quality assessment. A charge with
  // a prior refund and proof is strong evidence that could elevate quality.
  if (!stripeEvidencePayload.access_activity_log || !stripeEvidencePayload.uncategorized_text) {
    return 'low'
  }

  const hasCustomerIdentity =
    Boolean(stripeEvidencePayload.customer_name) ||
    Boolean(stripeEvidencePayload.customer_email_address)
  const hasAuthorizationSignal =
    Boolean(stripeEvidencePayload.customer_purchase_ip) ||
    Boolean(context.card?.checks?.addressLine1Check) ||
    Boolean(context.card?.checks?.addressPostalCodeCheck) ||
    Boolean(context.card?.checks?.cvcCheck) ||
    Boolean(context.card?.threeDSecure) ||
    context.paymentHistory.priorCharges.some((charge) => charge.paid && !charge.disputed)

  if (hasCustomerIdentity && hasAuthorizationSignal) return 'high'

  return 'medium'
}

function buildEvidencePdfR2Key(
  userId: UUIDv4,
  disputeCaseId: string,
  _reasonCodeCategory: StripeDisputeReasonCodeCategory,
  _productType: StripeDisputeEvidenceProductType,
  version: number,
  packetId: UUIDv4,
): string {
  return `users/${userId}/disputes/${disputeCaseId}/evidence-packets/v${version}/${packetId}/${disputeCaseId}-service-documentation.pdf`
}

function stripeEvidenceString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function nonEmptyString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function formatStripeServiceDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
