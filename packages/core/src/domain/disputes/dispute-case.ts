import { z } from 'zod'

import type { UUIDv4 } from '../primitives'

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

export const CONTEST_DECISION_REASONS = [
  'supported_card_fraud_adjacent',
  'non_card_mvp',
  'no_normal_contest_path',
  'special_handling_out_of_mvp',
  'post_mvp_reason',
  'visa_10_5_no_remedy',
  'general_reason',
  'review_only_reason',
  'no_usable_evidence_deadline',
  'evidence_deadline_past',
  'founder_declined',
] as const

export type ContestDecisionReason = (typeof CONTEST_DECISION_REASONS)[number]
export const contestDecisionReasonSchema = z.enum(CONTEST_DECISION_REASONS)

export type ContestDecision =
  | { decision: 'undecided'; reason: null; decidedAt: null }
  | {
      decision: Exclude<ContestDecisionKind, 'undecided'>
      reason: ContestDecisionReason
      decidedAt: Date
    }

export type MissingEvidence = {
  code: string
  message: string
}

export const DISPUTE_CASE_HUMAN_ACTION_REASONS = [
  'missing_input',
  'approval_required',
  'connection_repair',
  'submission_failed_retryable',
] as const

export type DisputeCaseHumanActionReason = (typeof DISPUTE_CASE_HUMAN_ACTION_REASONS)[number]
export const disputeCaseHumanActionReasonSchema = z.enum(DISPUTE_CASE_HUMAN_ACTION_REASONS)

export const DISPUTE_CASE_COMPLETION_REASONS = [
  'contest_submitted',
  'accept_submitted',
  'no_response',
  'deadline_missed',
] as const

export type DisputeCaseCompletionReason = (typeof DISPUTE_CASE_COMPLETION_REASONS)[number]
export const disputeCaseCompletionReasonSchema = z.enum(DISPUTE_CASE_COMPLETION_REASONS)

export type DisputeCaseWorkflowState =
  | { status: 'received' }
  | { status: 'evaluated'; evaluatedAt: Date }
  | { status: 'collecting_evidence'; startedAt: Date }
  | {
      status: 'awaiting_human'
      reason: DisputeCaseHumanActionReason
      missingEvidence: MissingEvidence[]
      evidencePacketId: UUIDv4 | null
      requestedAt: Date
    }
  | { status: 'completed'; reason: DisputeCaseCompletionReason; completedAt: Date }
  | { status: 'failed'; reason: string }

// Stripe Price recurring interval. Source:
// https://docs.stripe.com/api/prices/object#price_object-recurring-interval
export type StripePriceRecurringInterval = 'day' | 'week' | 'month' | 'year'
