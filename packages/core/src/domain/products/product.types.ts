import { STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES } from '../disputes/stripe-dispute-taxonomy'
import type { StripeDisputeEvidenceProductType } from '../disputes/stripe-dispute-taxonomy'

/** Mirrors Stripe's `evidence.product_type` enum. */
export const PRODUCT_TYPES = STRIPE_DISPUTE_EVIDENCE_PRODUCT_TYPES
export type ProductType = StripeDisputeEvidenceProductType

export const PRODUCT_STATUSES = ['setup_pending', 'setup_complete', 'disabled'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const SERVICE_START_RULES = [
  'charge_succeeded_at',
  'billing_period_start',
  'app_entitlement_started_at',
  'first_verified_usage_at',
  'merchant_provided',
] as const
export type ServiceStartRule = (typeof SERVICE_START_RULES)[number]

export const SERVICE_START_RULE_DESCRIPTIONS = {
  charge_succeeded_at:
    'Use the successful Stripe charge timestamp when payment itself starts access to the purchased service.',
  billing_period_start:
    'Use the Stripe invoice or subscription period start when the purchase is access to a paid billing period.',
  app_entitlement_started_at:
    'Use the merchant app timestamp when access, credits, seats, workspace, or license entitlement was granted.',
  first_verified_usage_at:
    'Use the first source-backed customer usage or delivery event when actual use is the strongest service-start proof.',
  merchant_provided:
    'Require merchant-provided service start evidence when no deterministic Stripe or app source is reliable.',
} satisfies Record<ServiceStartRule, string>
