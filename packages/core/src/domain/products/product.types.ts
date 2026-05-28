import { STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES } from '../disputes/stripe-dispute-taxonomy'
import type { StripeDisputeEvidenceProductType } from '../disputes/stripe-dispute-taxonomy'

/** Mirrors Stripe's `evidence.product_type` enum. */
export const PRODUCT_TYPES = STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES
export type ProductType = StripeDisputeEvidenceProductType

export const PRODUCT_STATUSES = ['setup_pending', 'setup_complete', 'disabled'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

// Rules for deriving the Stripe `service_date`, ordered strongest to weakest
// evidence. Riposte's own contract: Stripe imposes no enum, `service_date` is a
// free-text date. Pick the strongest a product supports; fall back down the list
// when a source is missing for a given dispute.
export const SERVICE_START_RULES = ['verified_usage', 'access_granted', 'billing_time'] as const
export type ServiceStartRule = (typeof SERVICE_START_RULES)[number]

export const SERVICE_START_RULE_DESCRIPTIONS = {
  verified_usage:
    'First verified product-use or delivery event for this charge in merchant app data (on or after the charge; for metered billing, the first use in the billed period). Strongest proof: the customer used what they paid for.',
  access_granted:
    'When the merchant app provisioned what the charge bought: account, seat, license, or credits. Use for credit packs, upgrades, and lifetime or one-time purchases, or when usage is not tracked. For trials and freemium, the moment paid access began, not earlier free usage.',
  billing_time:
    'Stripe billing timestamp: subscription period start for recurring charges, otherwise the successful charge date. Always available; the fallback when no app-side access or usage signal exists. Weakest proof: payment, not delivery.',
} satisfies Record<ServiceStartRule, string>
