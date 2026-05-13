import type { SupportedVisualEvidenceCategory, UUIDv4 } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'

import type { DisputeCase, DisputeCaseId } from './dispute-case.entity'
import type { StripeDisputeContext } from './stripe-dispute-context.entity'

export type FraudEvidencePdfArtifact = {
  kind: 'fraud_evidence_pdf'
  stripeEvidenceField: 'service_documentation'
  r2Key: string
  contentType: 'application/pdf'
}

export type DisputeEvidencePacketArtifact = FraudEvidencePdfArtifact

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
  category: SupportedVisualEvidenceCategory
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload
  pdfDocument: DisputeEvidencePdfDocument
  artifacts: DisputeEvidencePacketArtifact[]
  evidenceQuality: EvidenceQuality
  createdAt: Date
}

export type CreateDisputeEvidencePacketFromDisputeInput = {
  disputeCase: DisputeCase
  disputeContext: StripeDisputeContext
  collectedEvidence?: Partial<CollectedDisputeEvidence>
  previousPacket: DisputeEvidencePacket | null
  now: Date
}

export class DisputeEvidencePacket extends Entity<DisputeEvidencePacketSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly userId: UUIDv4,
    readonly disputeCaseId: DisputeCaseId,
    readonly version: number,
    readonly category: SupportedVisualEvidenceCategory,
    readonly stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
    readonly pdfDocument: DisputeEvidencePdfDocument,
    readonly artifacts: DisputeEvidencePacketArtifact[],
    readonly evidenceQuality: EvidenceQuality,
    readonly createdAt: Date,
  ) {
    super()
  }

  static createFromDispute(
    input: CreateDisputeEvidencePacketFromDisputeInput,
  ): DisputeEvidencePacket {
    const version = input.previousPacket ? input.previousPacket.version + 1 : 1
    const id = crypto.randomUUID() as UUIDv4
    const category: SupportedVisualEvidenceCategory = 'fraudulent'
    const caseSnapshot = input.disputeCase.serialize()
    const customerName =
      stripeEvidenceString(caseSnapshot.evidence.customer_name) ??
      input.disputeContext.customer?.name ??
      null
    const customerEmail =
      stripeEvidenceString(caseSnapshot.evidence.customer_email_address) ??
      input.disputeContext.customer?.email ??
      null
    const stripeEvidencePayload: FraudDigitalStripeEvidencePayload = {
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

    return new DisputeEvidencePacket(
      id,
      input.disputeCase.userId,
      input.disputeCase.id,
      version,
      category,
      stripeEvidencePayload,
      buildFraudEvidencePdfDocument(input.disputeCase, input.disputeContext, stripeEvidencePayload),
      [
        {
          kind: 'fraud_evidence_pdf',
          stripeEvidenceField: 'service_documentation',
          r2Key: buildFraudEvidencePdfR2Key(
            input.disputeCase.userId,
            input.disputeCase.id,
            version,
            id,
          ),
          contentType: 'application/pdf',
        },
      ],
      'medium',
      input.now,
    )
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

function buildFraudEvidencePdfDocument(
  disputeCase: DisputeCase,
  context: StripeDisputeContext,
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload,
): DisputeEvidencePdfDocument {
  const caseSnapshot = disputeCase.serialize()

  return {
    title: `Fraud dispute evidence for ${disputeCase.id}`,
    sections: [
      {
        heading: 'Transaction',
        rows: [
          { label: 'Dispute ID', value: disputeCase.id },
          { label: 'Charge ID', value: context.charge.id },
          { label: 'Amount', value: `${context.charge.amount} ${context.charge.currency}` },
          { label: 'Stripe reason', value: disputeCase.reason },
          {
            label: 'Network reason code',
            value: caseSnapshot.paymentMethodDetailsCardNetworkReasonCode ?? 'Not provided',
          },
        ],
      },
      {
        heading: 'Customer',
        rows: [
          { label: 'Name', value: stripeEvidencePayload.customer_name ?? 'Not provided' },
          { label: 'Email', value: stripeEvidencePayload.customer_email_address ?? 'Not provided' },
          {
            label: 'Purchase IP',
            value: stripeEvidencePayload.customer_purchase_ip ?? 'Not provided',
          },
        ],
      },
      {
        heading: 'Payment method',
        rows: [
          { label: 'Brand', value: context.card?.brand ?? 'Not provided' },
          { label: 'Network', value: context.card?.network ?? 'Not provided' },
          { label: 'Last 4', value: context.card?.last4 ?? 'Not provided' },
          { label: 'Fingerprint', value: context.card?.fingerprint ?? 'Not provided' },
          { label: 'CVC check', value: context.card?.checks?.cvcCheck ?? 'Not provided' },
          { label: '3D Secure', value: context.card?.threeDSecure?.result ?? 'Not provided' },
        ],
      },
      {
        heading: 'Refunds',
        rows: [
          { label: 'Refund count', value: String(context.refunds.length) },
          {
            label: 'Refund total',
            value: String(context.refunds.reduce((total, refund) => total + refund.amount, 0)),
          },
        ],
      },
      {
        heading: 'Prior payments',
        rows: [
          {
            label: 'Prior charge count',
            value: String(context.paymentHistory.priorCharges.length),
          },
          {
            label: 'Prior non-disputed charges',
            value: String(
              context.paymentHistory.priorCharges.filter((charge) => !charge.disputed).length,
            ),
          },
        ],
      },
    ],
  }
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
