import { ValidationError } from '@riposte/core'
import {
  MERCHANT_DISPUTE_FINDING_OUTCOME_DETAILS,
  type MerchantDisputeFindingOutcome,
} from '@riposte/core'
import type {
  StripeDisputeEvidenceProductType,
  StripeDisputeReasonCodeCategory,
} from '@riposte/core'
import { Result } from 'better-result'

import type { DisputeCase } from './dispute-case.entity'
import type { FraudDigitalStripeEvidencePayload } from './dispute-evidence-packet.entity'
import type { StripeDisputeContext } from './stripe-dispute-context.entity'

export type DisputeEvidencePdfSectionKey =
  | 'executive_summary'
  | 'customer_payment_match'
  | 'authorization_signals'
  | 'digital_product_delivered'
  | 'usage_timeline'
  | 'delivered_outputs'
  | 'refunds_communications_prior_relationship'

export type EvidencePacketSkeletonVariant = 'default'

export type EvidencePacketSkeletonSection = {
  key: DisputeEvidencePdfSectionKey
  heading: string
}

export type EvidencePacketSkeleton = {
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  variant: EvidencePacketSkeletonVariant
  title: string
  subtitle: string
  sections: EvidencePacketSkeletonSection[]
}

type EvidencePacketSkeletonRegistry = Partial<
  Record<
    StripeDisputeReasonCodeCategory,
    Partial<
      Record<
        StripeDisputeEvidenceProductType,
        Record<EvidencePacketSkeletonVariant, EvidencePacketSkeleton>
      >
    >
  >
>

export type DisputeEvidencePdfSection = {
  key: DisputeEvidencePdfSectionKey
  heading: string
  blocks: DisputeEvidencePdfBlock[]
}

export type DisputeEvidencePdfFact = {
  label: string
  value: string
}

export type DisputeEvidencePdfTimelineItem = {
  label: string
  value: string
}

export type DisputeEvidencePdfTableColumn = {
  key: string
  label: string
}

export type DisputeEvidencePdfTableRow = Record<string, string>

export type DisputeEvidencePdfImage = {
  label: string
  alt: string
  source: 'r2' | 'external' | 'generated'
  objectKey: string | null
  caption: string | null
}

export type DisputeEvidencePdfBlock =
  | { kind: 'callout'; tone: 'neutral' | 'strong' | 'warning'; title?: string; body: string }
  | { kind: 'key_value_grid'; columns: 2 | 3; items: DisputeEvidencePdfFact[] }
  | { kind: 'timeline'; items: DisputeEvidencePdfTimelineItem[] }
  | { kind: 'table'; columns: DisputeEvidencePdfTableColumn[]; rows: DisputeEvidencePdfTableRow[] }
  | { kind: 'image_grid'; title?: string; images: DisputeEvidencePdfImage[] }
  | { kind: 'text'; body: string }

export type DisputeEvidencePdfDocument = {
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  title: string
  subtitle: string
  finding: {
    outcome: MerchantDisputeFindingOutcome
    label: string
    value: string
  }
  sections: DisputeEvidencePdfSection[]
}

export type BuildEvidencePdfDocumentInput = {
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  disputeCase: DisputeCase
  disputeContext: StripeDisputeContext
  stripeEvidencePayload: FraudDigitalStripeEvidencePayload
}

/**
 * Semantic fraud evidence skeleton for digital products/services.
 *
 * Section keys are stable internal slots; headings are display copy and can later become
 * product-specific through agent or merchant setup context.
 */
const FRAUD_DIGITAL_PRODUCT_OR_SERVICE_SKELETON = {
  reasonCodeCategory: 'fraudulent',
  productType: 'digital_product_or_service',
  variant: 'default',
  title: 'Fraud Investigation Report',
  subtitle: 'Cardholder authorization and product access evidence',
  sections: [
    { key: 'executive_summary', heading: 'Executive Summary' },
    { key: 'customer_payment_match', heading: 'Customer & Payment Match' },
    { key: 'authorization_signals', heading: 'Authorization Signals' },
    { key: 'digital_product_delivered', heading: 'Digital Product Delivered' },
    { key: 'usage_timeline', heading: 'Usage Timeline' },
    { key: 'delivered_outputs', heading: 'Delivered Outputs' },
    {
      key: 'refunds_communications_prior_relationship',
      heading: 'Refunds, Communications & Prior Relationship',
    },
  ],
} as const satisfies EvidencePacketSkeleton

/**
 * Category/product registry. Expanding support should add an explicit skeleton here instead of
 * branching inside packet generation.
 */
const EVIDENCE_PACKET_SKELETONS: EvidencePacketSkeletonRegistry = {
  fraudulent: {
    digital_product_or_service: {
      default: FRAUD_DIGITAL_PRODUCT_OR_SERVICE_SKELETON,
    },
  },
  unrecognized: {
    digital_product_or_service: {
      default: {
        ...FRAUD_DIGITAL_PRODUCT_OR_SERVICE_SKELETON,
        reasonCodeCategory: 'unrecognized',
      },
    },
  },
}

export function getEvidencePacketSkeleton(input: {
  reasonCodeCategory: StripeDisputeReasonCodeCategory
  productType: StripeDisputeEvidenceProductType
  variant?: EvidencePacketSkeletonVariant
}): EvidencePacketSkeleton | null {
  return (
    EVIDENCE_PACKET_SKELETONS[input.reasonCodeCategory]?.[input.productType]?.[
      input.variant ?? 'default'
    ] ?? null
  )
}

/**
 * Builds the domain PDF document model from Stripe facts plus agent-collected merchant evidence.
 *
 * Missing merchant evidence is rendered explicitly so incomplete packets stay low quality instead
 * of looking stronger than they are.
 */
export function buildEvidencePdfDocument(
  input: BuildEvidencePdfDocumentInput,
): Result<DisputeEvidencePdfDocument, ValidationError> {
  const skeleton = getEvidencePacketSkeleton({
    reasonCodeCategory: input.reasonCodeCategory,
    productType: input.productType,
  })
  if (!skeleton) {
    return Result.err(
      new ValidationError({
        message: `Evidence packet skeleton is not supported for ${input.reasonCodeCategory}/${input.productType}`,
        issues: [
          {
            code: 'not_implemented',
            path: ['reasonCodeCategory', 'productType'],
            message: `Evidence packet skeleton is not supported for ${input.reasonCodeCategory}/${input.productType}`,
          },
        ],
      }),
    )
  }

  return Result.ok({
    reasonCodeCategory: skeleton.reasonCodeCategory,
    productType: skeleton.productType,
    title: skeleton.title,
    subtitle: skeleton.subtitle,
    finding: merchantFindingForEvidence(input.stripeEvidencePayload),
    sections: skeleton.sections.map((section) => buildEvidencePdfSection(section, input)),
  })
}

function merchantFindingForEvidence(payload: FraudDigitalStripeEvidencePayload): {
  outcome: MerchantDisputeFindingOutcome
  label: string
  value: string
} {
  const outcome =
    payload.access_activity_log && payload.uncategorized_text
      ? 'supports_merchant_position'
      : 'needs_more_evidence'
  const details = MERCHANT_DISPUTE_FINDING_OUTCOME_DETAILS[outcome]

  return {
    outcome,
    label: 'Merchant finding',
    value: details.label,
  }
}

function buildEvidencePdfSection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  switch (section.key) {
    case 'executive_summary':
      return buildExecutiveSummarySection(section, input)
    case 'customer_payment_match':
      return buildCustomerPaymentMatchSection(section, input)
    case 'authorization_signals':
      return buildAuthorizationSignalsSection(section, input)
    case 'digital_product_delivered':
      return buildDigitalProductDeliveredSection(section, input)
    case 'usage_timeline':
      return buildUsageTimelineSection(section, input)
    case 'delivered_outputs':
      return buildDeliveredOutputsSection(section, input)
    case 'refunds_communications_prior_relationship':
      return buildRefundsCommunicationsPriorRelationshipSection(section, input)
    default:
      section.key satisfies never
      throw new Error('Unsupported evidence PDF section')
  }
}

function buildExecutiveSummarySection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  const caseSnapshot = input.disputeCase.serialize()

  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'key_value_grid',
        columns: 2,
        items: [
          {
            label: 'Case',
            value: `Stripe dispute ${input.disputeCase.id} for ${formatMoney(input.disputeContext.charge.amount, input.disputeContext.charge.currency)} on charge ${input.disputeContext.charge.id}`,
          },
          {
            label: 'Stripe reason',
            value: titleCase(caseSnapshot.reason),
          },
          {
            label: 'Network reason code',
            value: providedByStripe(caseSnapshot.paymentMethodDetailsCardNetworkReasonCode),
          },
        ],
      },
      {
        kind: 'callout',
        tone: input.stripeEvidencePayload.uncategorized_text ? 'strong' : 'warning',
        title: 'Finding',
        // TODO(agent): Generate this McKinsey-style up-front summary from verified facts only.
        // The agent should also return MerchantDisputeFindingOutcome when it can classify the
        // case from source-backed evidence instead of relying on the fallback below.
        // Do not let a Stripe dispute reason become our characterization of the case.
        body: evidenceOrMissing(
          input.stripeEvidencePayload.uncategorized_text,
          'merchant finding that connects customer/payment match, authorization signals, and actual digital product delivery',
        ),
      },
      {
        kind: 'callout',
        tone: 'neutral',
        title: 'Basis',
        // TODO(agent): Generate this from multiple verified facts, not from the raw activity log.
        // It should summarize why the finding follows from customer/payment match, authorization
        // signals, and delivered product evidence.
        body: missingEvidence(
          'agent-generated basis tying customer/payment match, authorization signals, and delivered product evidence together',
        ),
      },
    ],
  }
}

function buildCustomerPaymentMatchSection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  const context = input.disputeContext

  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'key_value_grid',
        columns: 2,
        items: [
          { label: 'Dispute ID', value: input.disputeCase.id },
          { label: 'Payment ID', value: providedByStripe(context.charge.paymentIntent) },
          { label: 'Charge ID', value: context.charge.id },
          { label: 'Amount', value: formatMoney(context.charge.amount, context.charge.currency) },
          {
            label: 'Statement descriptor',
            value: providedByStripe(context.charge.calculatedStatementDescriptor),
          },
          {
            label: 'Customer',
            value: evidenceOrMissing(input.stripeEvidencePayload.customer_name, 'customer name'),
          },
          {
            label: 'Email',
            value: evidenceOrMissing(
              input.stripeEvidencePayload.customer_email_address,
              'customer email address',
            ),
          },
          {
            label: 'Merchant account match',
            // TODO(agent): Strengthen this with merchant account facts: matched user/account id,
            // signup date, email verification, account status, and identity history. Stripe customer
            // data alone is useful but not the app-specific proof Riposte is built to provide.
            value: missingEvidence(
              'merchant user/account identity matched to the Stripe customer or payment',
            ),
          },
        ],
      },
    ],
  }
}

function buildAuthorizationSignalsSection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  const context = input.disputeContext

  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'key_value_grid',
        columns: 3,
        items: [
          {
            label: 'Purchase IP',
            value: providedByStripe(input.stripeEvidencePayload.customer_purchase_ip),
          },
          { label: 'Card brand', value: providedByStripe(context.card?.brand ?? null) },
          { label: 'Card network', value: providedByStripe(context.card?.network ?? null) },
          { label: 'Card last four', value: providedByStripe(context.card?.last4 ?? null) },
          { label: 'Card fingerprint', value: providedByStripe(context.card?.fingerprint ?? null) },
          {
            label: 'Address check',
            value: providedByStripe(context.card?.checks?.addressPostalCodeCheck ?? null),
          },
          {
            label: 'CVC check',
            value: providedByStripe(context.card?.checks?.cvcCheck ?? null),
          },
          {
            label: '3D Secure',
            value: providedByStripe(context.card?.threeDSecure?.result ?? null),
          },
          { label: 'Risk level', value: providedByStripe(context.risk.level) },
          { label: 'Risk score', value: providedByStripe(context.risk.score?.toString() ?? null) },
          {
            label: 'Risk outcome',
            value: providedByStripe(context.risk.outcomeType),
          },
          {
            label: 'Review IP location',
            value: context.risk.review?.ipAddressLocation
              ? JSON.stringify(context.risk.review.ipAddressLocation)
              : providedByStripe(null),
          },
        ],
      },
    ],
  }
}

function buildDigitalProductDeliveredSection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'callout',
        tone: input.stripeEvidencePayload.access_activity_log ? 'strong' : 'warning',
        title: 'Delivery summary',
        // TODO(agent): This is Riposte's core wedge. Fill from merchant systems with a concise
        // product-specific summary: service type, delivery method, first use, last use, usage count,
        // and key value delivered. Stripe does not see this data.
        body: evidenceOrMissing(
          input.stripeEvidencePayload.access_activity_log,
          'source-backed proof that the customer accessed, used, downloaded, or received the digital product after payment',
        ),
      },
      {
        kind: 'text',
        // TODO(agent): Allow product-specific display names here, for example "Recent Renders
        // Delivered", "Transcriptions Delivered", "AI Photos Generated", or "Lessons Completed".
        body: missingEvidence('agent/product context for how this merchant delivers value'),
      },
    ],
  }
}

function buildUsageTimelineSection(
  section: EvidencePacketSkeletonSection,
  _input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'timeline',
        // TODO(agent): Fill a chronological proof trail: account match/creation, payment success,
        // first product use after payment, key usage/output events, latest activity, and dispute
        // creation. Keep it short enough for issuer review.
        items: [
          {
            label: 'Missing timeline',
            value: missingEvidence(
              'chronological usage timeline connecting payment, account activity, product delivery, and dispute timing',
            ),
          },
        ],
      },
    ],
  }
}

function buildDeliveredOutputsSection(
  section: EvidencePacketSkeletonSection,
  _input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'image_grid',
        title: 'Delivered outputs',
        // TODO(agent): Attach or summarize actual delivered outputs when the product has them:
        // renders, generated images, transcripts, exports, downloads, API results, course progress,
        // or other merchant-specific proof. This is the Levels.io-style proof page.
        images: [],
      },
      {
        kind: 'text',
        body: missingEvidence(
          'product-specific delivered outputs, screenshots, files, or records proving the customer received value',
        ),
      },
    ],
  }
}

function buildRefundsCommunicationsPriorRelationshipSection(
  section: EvidencePacketSkeletonSection,
  input: BuildEvidencePdfDocumentInput,
): DisputeEvidencePdfSection {
  const caseSnapshot = input.disputeCase.serialize()
  const priorCharges = input.disputeContext.paymentHistory.priorCharges
  const priorNonDisputedCharges = priorCharges.filter((charge) => !charge.disputed)
  const disputedFingerprint = input.disputeContext.card?.fingerprint ?? null
  const matchingFingerprintCharges = disputedFingerprint
    ? priorNonDisputedCharges.filter((charge) => charge.card?.fingerprint === disputedFingerprint)
        .length
    : null

  return {
    key: section.key,
    heading: section.heading,
    blocks: [
      {
        kind: 'key_value_grid',
        columns: 2,
        items: [
          {
            label: 'Refund count',
            value:
              input.disputeContext.refunds.length === 0
                ? 'No refunds found in Stripe refund records for this charge'
                : String(input.disputeContext.refunds.length),
          },
          {
            label: 'Refund total',
            value: formatMoney(
              input.disputeContext.refunds.reduce((total, refund) => total + refund.amount, 0),
              caseSnapshot.currency,
            ),
          },
          {
            label: 'Prior charges',
            value: `${priorNonDisputedCharges.length} prior successful payment(s)`,
          },
          {
            label: 'Same card fingerprint',
            // TODO(agent): For Visa CE 3.0-style defense, add merchant-side matching elements where
            // available, especially prior IP address, device fingerprint, email, and account identity.
            value:
              matchingFingerprintCharges === null
                ? providedByStripe(null)
                : `${matchingFingerprintCharges} prior non-disputed payment(s) with the same card fingerprint`,
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Communications',
        body: missingEvidence(
          'source-backed customer communication, refund request, cancellation request, dispute withdrawal, or confirmation that no relevant communication was found',
        ),
      },
    ],
  }
}

/**
 * Marks merchant/agent evidence gaps. These are actionable missing inputs, not Stripe API absence.
 */
function evidenceOrMissing(value: string | null, expectedEvidence: string): string {
  if (value?.trim()) return value
  return missingEvidence(expectedEvidence)
}

/**
 * Marks fields unavailable from Stripe so we do not imply the merchant failed to provide them.
 */
function providedByStripe(value: string | null): string {
  if (value?.trim()) return value
  return 'Not provided by Stripe'
}

function missingEvidence(expectedEvidence: string): string {
  return `Missing evidence: ${expectedEvidence}`
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
