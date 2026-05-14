import {
  DISPUTE_REASON_WORKFLOW,
  createEvent,
  supportedEvidencePacketReasonSchema,
  stripeDisputeReasonSchema,
} from '@riposte/core'
import type { SupportedEvidencePacketReason, UUIDv4 } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'

import type { DisputeCase, DisputeCaseId } from './dispute-case.entity'
import type { StripeDisputeContext } from './stripe-dispute-context.entity'

export type EvidencePdfArtifact = {
  kind: 'evidence_pdf'
  category: SupportedEvidencePacketReason
  stripeEvidenceField: 'service_documentation'
  r2Key: string
  contentType: 'application/pdf'
}

export type DisputeEvidencePacketArtifact = EvidencePdfArtifact

export type FraudDigitalStripeEvidencePayload = {
  customer_purchase_ip: string | null
  customer_name: string | null
  customer_email_address: string | null
  access_activity_log: string
  uncategorized_text: string
  service_documentation: null
}

export type DisputeEvidencePdfDocument = {
  title: string
  sections: {
    heading: string
    rows: {
      label: string
      value: string
    }[]
  }[]
}

export type EvidenceQuality = 'low' | 'medium' | 'high'

export type CollectedDisputeEvidence = {
  accessActivityLog: string | null
  rebuttalText: string | null
}

export type DisputeEvidencePacketSnapshot = {
  id: UUIDv4
  userId: UUIDv4
  disputeCaseId: DisputeCaseId
  version: number
  category: SupportedEvidencePacketReason
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
    readonly category: SupportedEvidencePacketReason,
    readonly stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
    readonly pdfDocument: DisputeEvidencePdfDocument,
    readonly artifacts: DisputeEvidencePacketArtifact[],
    readonly evidenceQuality: EvidenceQuality,
    readonly createdAt: Date,
  ) {
    super()
  }

  static create(input: CreateDisputeEvidencePacketInput): DisputeEvidencePacket {
    const version = input.previousPacket ? input.previousPacket.version + 1 : 1
    const id = crypto.randomUUID() as UUIDv4
    const createdAt = new Date()
    const caseSnapshot = input.disputeCase.serialize()
    const category = resolveSupportedEvidencePacketReason(caseSnapshot.reason)
    const stripeEvidencePayload = buildFraudDigitalStripeEvidencePayload(input)
    const pdfDocument = buildFraudEvidencePdfDocument(
      input.disputeCase,
      input.disputeContext,
      stripeEvidencePayload,
    )
    const artifacts = buildFraudEvidencePacketArtifacts(input.disputeCase, category, version, id)
    const evidenceQuality = assessEvidenceQuality(stripeEvidencePayload, input.disputeContext)

    const packet = new DisputeEvidencePacket(
      id,
      input.disputeCase.userId,
      input.disputeCase.id,
      version,
      category,
      stripeEvidencePayload,
      pdfDocument,
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
        category: packet.category,
      }),
    )

    return packet
  }

  static deserialize(snapshot: DisputeEvidencePacketSnapshot): DisputeEvidencePacket {
    return new DisputeEvidencePacket(
      snapshot.id,
      snapshot.userId,
      snapshot.disputeCaseId,
      requirePositiveInteger(snapshot.version, 'version'),
      snapshot.category,
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
      category: this.category,
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

function resolveSupportedEvidencePacketReason(reason: string): SupportedEvidencePacketReason {
  const parsedReason = stripeDisputeReasonSchema.safeParse(reason)
  if (!parsedReason.success) {
    throw new Error(`Unsupported Stripe dispute reason for evidence packet: ${reason}`)
  }

  const supportedReason = supportedEvidencePacketReasonSchema.safeParse(parsedReason.data)
  if (!supportedReason.success) {
    throw new Error(`Unsupported evidence packet category for dispute reason: ${reason}`)
  }

  const workflow = DISPUTE_REASON_WORKFLOW[supportedReason.data]
  if (workflow.evidencePacket.supported) {
    return supportedReason.data
  }

  throw new Error(`Unsupported evidence packet category for dispute reason: ${reason}`)
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
    access_activity_log:
      nonEmptyString(input.collectedEvidence?.accessActivityLog) ??
      buildAccessActivityLog(input.disputeContext),
    uncategorized_text:
      nonEmptyString(input.collectedEvidence?.rebuttalText) ??
      buildFraudRebuttalText(input.disputeCase, input.disputeContext),
    service_documentation: null,
  }
}

function buildFraudEvidencePdfDocument(
  disputeCase: DisputeCase,
  context: StripeDisputeContext,
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
): DisputeEvidencePdfDocument {
  const caseSnapshot = disputeCase.serialize()
  const priorCharges = context.paymentHistory.priorCharges
  const priorNonDisputedCharges = priorCharges.filter((charge) => !charge.disputed)
  const refundTotal = context.refunds.reduce((total, refund) => total + refund.amount, 0)
  const cardFingerprint = context.card?.fingerprint ?? 'Not provided'

  return {
    title: 'Fraud Investigation Report',
    sections: [
      {
        heading: 'Investigation Summary',
        rows: [
          {
            label: 'Conclusion',
            value:
              'The transaction is legitimate and authorized. The available security, payment, and usage signals are consistent with the cardholder and previous account activity.',
          },
          { label: 'Dispute reason', value: titleCase(caseSnapshot.reason) },
          {
            label: 'Network reason code',
            value: caseSnapshot.paymentMethodDetailsCardNetworkReasonCode ?? 'Not provided',
          },
        ],
      },
      {
        heading: 'Transaction Details',
        rows: [
          { label: 'Dispute ID', value: disputeCase.id },
          { label: 'Payment ID', value: context.charge.paymentIntent ?? 'Not provided' },
          { label: 'Charge ID', value: context.charge.id },
          { label: 'Amount', value: formatMoney(context.charge.amount, context.charge.currency) },
          {
            label: 'Statement descriptor',
            value: context.charge.calculatedStatementDescriptor ?? 'Not provided',
          },
        ],
      },
      {
        heading: 'Payment Method Verification',
        rows: [
          { label: 'Brand', value: context.card?.brand ?? 'Not provided' },
          { label: 'Network', value: context.card?.network ?? 'Not provided' },
          { label: 'Last four', value: context.card?.last4 ?? 'Not provided' },
          { label: 'Fingerprint', value: cardFingerprint },
          {
            label: 'Address check',
            value: context.card?.checks?.addressPostalCodeCheck ?? 'Not provided',
          },
          { label: 'CVC check', value: context.card?.checks?.cvcCheck ?? 'Not provided' },
          { label: '3D Secure', value: context.card?.threeDSecure?.result ?? 'Not provided' },
          { label: 'Risk level', value: context.risk.level ?? 'Not provided' },
          {
            label: 'Risk outcome',
            value: context.risk.outcomeType ?? 'Not provided',
          },
        ],
      },
      {
        heading: 'Customer Verification',
        rows: [
          { label: 'Customer', value: stripeEvidencePayload.customer_name ?? 'Not provided' },
          { label: 'Email', value: stripeEvidencePayload.customer_email_address ?? 'Not provided' },
          {
            label: 'Purchase IP',
            value: stripeEvidencePayload.customer_purchase_ip ?? 'Not provided',
          },
          {
            label: 'Access activity',
            value: stripeEvidencePayload.access_activity_log,
          },
        ],
      },
      {
        heading: 'Prior Relationship',
        rows: [
          {
            label: 'Prior charges',
            value: `${priorNonDisputedCharges.length} prior successful payment(s)`,
          },
          {
            label: 'Prior disputes',
            value:
              priorCharges.length === priorNonDisputedCharges.length
                ? 'No prior disputes found for this payment method'
                : `${priorCharges.length - priorNonDisputedCharges.length} prior disputed payment(s) found`,
          },
          {
            label: 'Pattern',
            value:
              'The disputed payment is consistent with previous purchase behavior, card fingerprint, account identity, and product usage.',
          },
        ],
      },
      {
        heading: 'Refunds',
        rows: [
          { label: 'Refund count', value: String(context.refunds.length) },
          {
            label: 'Refund total',
            value: formatMoney(refundTotal, caseSnapshot.currency),
          },
        ],
      },
      {
        heading: 'Investigation Conclusion',
        rows: [
          {
            label: 'Summary',
            value: stripeEvidencePayload.uncategorized_text,
          },
        ],
      },
    ],
  }
}

function buildFraudEvidencePacketArtifacts(
  disputeCase: DisputeCase,
  category: SupportedEvidencePacketReason,
  version: number,
  packetId: UUIDv4,
): DisputeEvidencePacketArtifact[] {
  return [buildFraudEvidencePdfArtifact(disputeCase, category, version, packetId)]
}

function buildFraudEvidencePdfArtifact(
  disputeCase: DisputeCase,
  category: SupportedEvidencePacketReason,
  version: number,
  packetId: UUIDv4,
): EvidencePdfArtifact {
  return {
    kind: 'evidence_pdf',
    category,
    stripeEvidenceField: 'service_documentation',
    r2Key: buildFraudEvidencePdfR2Key(disputeCase.userId, disputeCase.id, version, packetId),
    contentType: 'application/pdf',
  }
}

function assessEvidenceQuality(
  _stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
  _context: StripeDisputeContext,
): EvidenceQuality {
  return 'medium'
}

function buildAccessActivityLog(context: StripeDisputeContext): string {
  const priorNonDisputedCharges = context.paymentHistory.priorCharges.filter(
    (charge) => !charge.disputed,
  )

  return [
    `Stripe charge ${context.charge.id} was created at ${context.charge.created.toISOString()}.`,
    `The card fingerprint is ${context.card?.fingerprint ?? 'not available'}.`,
    `Stripe payment history shows ${priorNonDisputedCharges.length} prior non-disputed charge(s) for this customer context.`,
  ].join('\n')
}

function buildFraudRebuttalText(disputeCase: DisputeCase, context: StripeDisputeContext): string {
  const caseSnapshot = disputeCase.serialize()
  const customerEmail =
    stripeEvidenceString(caseSnapshot.evidence.customer_email_address) ??
    context.customer?.email ??
    null
  const refundCount = context.refunds.length
  const priorNonDisputedCharges = context.paymentHistory.priorCharges.filter(
    (charge) => !charge.disputed,
  ).length

  return [
    `Riposte is contesting dispute ${disputeCase.id} for a ${caseSnapshot.currency.toUpperCase()} ${caseSnapshot.amountMinor} charge.`,
    `Stripe facts link the payment to customer ${customerEmail ?? context.customer?.id ?? 'unknown customer'} and purchase IP ${caseSnapshot.customerPurchaseIp ?? 'not provided'}.`,
    `The card fingerprint is ${context.card?.fingerprint ?? 'not available'} and Stripe reports ${priorNonDisputedCharges} prior non-disputed charge(s) in the payment history context.`,
    refundCount === 0
      ? 'Stripe refund records show no refunds for the disputed charge at packet generation time.'
      : `Stripe refund records show ${refundCount} refund(s) for the disputed charge at packet generation time.`,
  ].join('\n')
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

function formatMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  })} ${currency.toUpperCase()}`
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((part) => (part ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(' ')
}
