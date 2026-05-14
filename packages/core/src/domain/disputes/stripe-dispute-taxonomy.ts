import type Stripe from 'stripe'
import { z } from 'zod'

// Runtime mirror of stripe-node's Stripe.Dispute.Status union. Stripe exposes this as a
// TypeScript type, not a runtime enum, so Zod needs our own tuple.
export const STRIPE_DISPUTE_STATUSES = [
  'lost',
  'needs_response',
  'prevented',
  'under_review',
  'warning_closed',
  'warning_needs_response',
  'warning_under_review',
  'won',
] as const satisfies readonly Stripe.Dispute.Status[]

export type StripeDisputeStatus = (typeof STRIPE_DISPUTE_STATUSES)[number]
export const stripeDisputeStatusSchema = z.enum(STRIPE_DISPUTE_STATUSES)

// Runtime mirror of Stripe.Dispute.Reason.
// Source: https://docs.stripe.com/api/disputes/object#dispute_object-reason
export const STRIPE_DISPUTE_REASONS = [
  'bank_cannot_process',
  'check_returned',
  'credit_not_processed',
  'customer_initiated',
  'debit_not_authorized',
  'duplicate',
  'fraudulent',
  'general',
  'incorrect_account_details',
  'insufficient_funds',
  'noncompliant',
  'product_not_received',
  'product_unacceptable',
  'subscription_canceled',
  'unrecognized',
] as const

export type StripeDisputeReason = (typeof STRIPE_DISPUTE_REASONS)[number]
export const stripeDisputeReasonSchema = z.enum(STRIPE_DISPUTE_REASONS)

// Stripe dispute reason-code categories. These are Stripe's evidence-guidance
// buckets, not Riposte policy decisions.
// Sources:
// - https://docs.stripe.com/disputes/categories
// - https://docs.stripe.com/disputes/reason-codes-defense-requirements
export const STRIPE_DISPUTE_REASON_CODE_CATEGORIES = [
  'credit_not_processed',
  'duplicate',
  'fraudulent',
  'general',
  'noncompliant',
  'product_not_received',
  'product_unacceptable',
  'subscription_canceled',
  'unrecognized',
] as const

export type StripeDisputeReasonCodeCategory = (typeof STRIPE_DISPUTE_REASON_CODE_CATEGORIES)[number]
export const stripeDisputeReasonCodeCategorySchema = z.enum(STRIPE_DISPUTE_REASON_CODE_CATEGORIES)

// Stripe visual evidence product-type selector.
// Source: https://docs.stripe.com/disputes/visual-evidence
export const STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES = [
  'physical_product',
  'digital_product_or_service',
  'offline_service',
] as const

export type StripeDisputeEvidenceProductType =
  (typeof STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES)[number]
export const stripeDisputeEvidenceProductTypeSchema = z.enum(STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES)

export const STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS = {
  credit_not_processed: {
    label: 'Credit not processed',
    description:
      'The cardholder claims they were entitled to a refund or credit because the purchase was returned, canceled, or not fully fulfilled.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, focus on the refund or cancellation policy shown before purchase, why no refund was due, customer communications, and logs showing access or partial use.',
  },
  duplicate: {
    label: 'Duplicate',
    description:
      'The cardholder claims they were charged multiple times for the same product or service.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, prove whether the payments were separate purchases or one charge was already refunded; compare charge IDs, timestamps, receipts, and customer communications.',
  },
  fraudulent: {
    label: 'Fraudulent',
    description: 'The cardholder claims they did not authorize or participate in the transaction.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, prove the legitimate cardholder or an authorized user made the payment using IP, customer identity, access logs, AVS/CVC/3DS results, and prior undisputed activity when available.',
  },
  general: {
    label: 'General',
    description:
      'A catch-all category for disputes that do not fit neatly into a more specific category.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, treat this as a fact-pattern review: use receipts, order confirmation, pricing disclosure, system logs, and customer communications to address the specific claim.',
  },
  noncompliant: {
    label: 'Noncompliant',
    description:
      'A special Visa compliance dispute where the issuer claims a network-rules violation; Stripe collects a 500 USD or local equivalent network fee if you contest it, refunded if you win.',
    hasVisualEvidenceGuidelines: false,
    internalHandlingNote:
      'There is no normal visual evidence packet. Route to explicit review because contesting requires acknowledging Stripe collection of the Visa compliance network fee.',
  },
  product_not_received: {
    label: 'Product not received',
    description: 'The cardholder claims they did not receive the purchased goods or services.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, prove delivery and access with fulfillment emails, activation or download records, login/activity logs, and terms explaining digital delivery.',
  },
  product_unacceptable: {
    label: 'Product unacceptable',
    description:
      'The cardholder claims the received product or service was not as described, counterfeit, or defective.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital goods, show the product matched the purchase description and functioned as expected using the listing at purchase time, usage logs, support history, and resolution records.',
  },
  subscription_canceled: {
    label: 'Subscription canceled',
    description:
      'The cardholder claims they were charged for a recurring service or subscription after cancellation.',
    hasVisualEvidenceGuidelines: true,
    internalHandlingNote:
      'For digital subscriptions, show signup terms, renewal and cancellation policy disclosure, cancellation records or lack of timely cancellation, billing notices, and continued usage logs.',
  },
  unrecognized: {
    label: 'Unrecognized',
    description:
      'The cardholder does not recognize the payment on their statement; Stripe treats this similarly to fraudulent but with a potentially lower evidence burden.',
    hasVisualEvidenceGuidelines: false,
    internalHandlingNote:
      'For digital goods, handle like fraudulent evidence: connect the cardholder to the account with customer identity, purchase IP, access logs, receipts, and charge-recognition context.',
  },
} as const satisfies Record<
  StripeDisputeReasonCodeCategory,
  {
    label: string
    description: string
    hasVisualEvidenceGuidelines: boolean
    internalHandlingNote: string
  }
>
