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
] as const

export type StripeDisputeStatus = (typeof STRIPE_DISPUTE_STATUSES)[number]
export const stripeDisputeStatusSchema = z.enum(STRIPE_DISPUTE_STATUSES)

export const STRIPE_DISPUTE_REASONS_FRAUD_ADJACENT = ['fraudulent', 'unrecognized'] as const

// Stripe visual evidence categories:
// https://docs.stripe.com/disputes/visual-evidence
export const STRIPE_VISUAL_EVIDENCE_CATEGORIES = [
  'credit_not_processed',
  'duplicate',
  'fraudulent',
  'general',
  'product_not_received',
  'product_unacceptable',
  'subscription_canceled',
] as const

export type StripeVisualEvidenceCategory = (typeof STRIPE_VISUAL_EVIDENCE_CATEGORIES)[number]
export const stripeVisualEvidenceCategorySchema = z.enum(STRIPE_VISUAL_EVIDENCE_CATEGORIES)

export const SUPPORTED_VISUAL_EVIDENCE_CATEGORIES = ['fraudulent'] as const

export type SupportedVisualEvidenceCategory =
  (typeof SUPPORTED_VISUAL_EVIDENCE_CATEGORIES)[number]
export const supportedVisualEvidenceCategorySchema = z.enum(SUPPORTED_VISUAL_EVIDENCE_CATEGORIES)

export const STRIPE_DISPUTE_REASONS_REVIEW_ONLY = ['product_not_received', 'duplicate'] as const

export const STRIPE_DISPUTE_REASONS_NO_NORMAL_CONTEST_PATH = [
  'bank_cannot_process',
  'debit_not_authorized',
  'incorrect_account_details',
  'insufficient_funds',
] as const

export const STRIPE_DISPUTE_REASONS_SPECIAL_HANDLING_OUT_OF_MVP = [
  'check_returned',
  'customer_initiated',
  'noncompliant',
] as const

export const STRIPE_DISPUTE_REASONS_POST_MVP = [
  'credit_not_processed',
  'product_unacceptable',
  'subscription_canceled',
] as const

export const DISPUTE_CASE_WORKFLOW_STATUSES = [
  'received',
  'evaluated',
  'collecting_evidence',
  'awaiting_human',
  'completed',
  'failed',
] as const

export type DisputeCaseWorkflowStatus = (typeof DISPUTE_CASE_WORKFLOW_STATUSES)[number]
export const disputeCaseWorkflowStatusSchema = z.enum(DISPUTE_CASE_WORKFLOW_STATUSES)

export const CONTEST_DECISIONS = ['undecided', 'contest', 'accept', 'no_response'] as const

export type ContestDecisionKind = (typeof CONTEST_DECISIONS)[number]
export const contestDecisionKindSchema = z.enum(CONTEST_DECISIONS)

export const CONTEST_DECISION_REASONS_CONTEST = ['supported_card_fraud_adjacent'] as const

export const CONTEST_DECISION_REASONS_NO_RESPONSE = [
  'non_card_mvp',
  'no_normal_contest_path',
  'special_handling_out_of_mvp',
  'post_mvp_reason',
  'visa_10_5_no_remedy',
  'no_usable_evidence_deadline',
  'evidence_deadline_past',
] as const

export const CONTEST_DECISION_REASONS_AWAIT_HUMAN = [
  'general_reason',
  'review_only_reason',
] as const

export const CONTEST_DECISION_REASONS_MERCHANT = ['merchant_declined'] as const

export const CONTEST_DECISION_REASONS = [
  ...CONTEST_DECISION_REASONS_CONTEST,
  ...CONTEST_DECISION_REASONS_NO_RESPONSE,
  ...CONTEST_DECISION_REASONS_AWAIT_HUMAN,
  ...CONTEST_DECISION_REASONS_MERCHANT,
] as const

export type ContestDecisionReason = (typeof CONTEST_DECISION_REASONS)[number]
export const contestDecisionReasonSchema = z.enum(CONTEST_DECISION_REASONS)

export type ContestDecision =
  | { status: 'undecided' }
  | {
      status: Exclude<ContestDecisionKind, 'undecided'>
      reason: ContestDecisionReason
      decidedAt: Date
    }

// Stripe Price recurring interval. Source:
// https://docs.stripe.com/api/prices/object#price_object-recurring-interval
export type StripePriceRecurringInterval = 'day' | 'week' | 'month' | 'year'
