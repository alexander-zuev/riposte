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
  'collecting_evidence',
  'needs_input',
  'ready_for_review',
  'submitted',
  'accepted',
  'deadline_missed',
  'won',
  'lost',
  'failed',
] as const

export type DisputeCaseWorkflowStatus = (typeof DISPUTE_CASE_WORKFLOW_STATUSES)[number]
export const disputeCaseWorkflowStatusSchema = z.enum(DISPUTE_CASE_WORKFLOW_STATUSES)

export type MissingEvidence = {
  code: string
  message: string
}

export type DisputeCaseWorkflowState =
  | { status: 'received' }
  | { status: 'collecting_evidence'; startedAt: Date }
  | { status: 'needs_input'; missingEvidence: MissingEvidence[] }
  | { status: 'ready_for_review'; evidencePacketId: UUIDv4 }
  | { status: 'submitted'; evidencePacketId: UUIDv4; submittedAt: Date }
  | { status: 'accepted'; acceptedAt: Date }
  | { status: 'deadline_missed'; missedAt: Date }
  | { status: 'won'; decidedAt: Date }
  | { status: 'lost'; decidedAt: Date }
  | { status: 'failed'; reason: string }
