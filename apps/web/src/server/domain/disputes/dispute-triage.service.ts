import type { DisputeCase } from './dispute-case.entity'

export type DisputeTriageDecision =
  | { action: 'continue_to_enrichment'; reason: 'card_fraud_adjacent' }
  | {
      action: 'ignore'
      reason:
        | 'non_card_mvp'
        | 'no_normal_contest_path'
        | 'special_handling_out_of_mvp'
        | 'post_mvp_reason'
        | 'visa_10_5_no_remedy'
    }
  | {
      action: 'needs_input'
      reason: 'general_reason' | 'review_only_reason' | 'no_usable_evidence_deadline'
    }
  | { action: 'deadline_missed'; reason: 'evidence_deadline_past' }

const coreFraudAdjacentReasons = new Set(['fraudulent', 'unrecognized'])
const reviewOnlyReasons = new Set(['product_not_received', 'duplicate'])
const noNormalContestPathReasons = new Set([
  'bank_cannot_process',
  'debit_not_authorized',
  'incorrect_account_details',
  'insufficient_funds',
])
const specialHandlingOutOfMvpReasons = new Set([
  'check_returned',
  'customer_initiated',
  'noncompliant',
])
const postMvpReasons = new Set([
  'credit_not_processed',
  'product_unacceptable',
  'subscription_canceled',
])

export function triageDisputeCase(
  disputeCase: DisputeCase,
  now: Date = new Date(),
): DisputeTriageDecision {
  const decision = decideDisputeTriage(disputeCase, now)
  applyTriageDecision(disputeCase, decision, now)

  return decision
}

function decideDisputeTriage(
  disputeCase: DisputeCase,
  now: Date = new Date(),
): DisputeTriageDecision {
  if (disputeCase.paymentMethodDetailsType !== 'card') {
    return { action: 'ignore', reason: 'non_card_mvp' }
  }

  if (noNormalContestPathReasons.has(disputeCase.reason)) {
    return { action: 'ignore', reason: 'no_normal_contest_path' }
  }

  if (specialHandlingOutOfMvpReasons.has(disputeCase.reason)) {
    return { action: 'ignore', reason: 'special_handling_out_of_mvp' }
  }

  if (postMvpReasons.has(disputeCase.reason)) {
    return { action: 'ignore', reason: 'post_mvp_reason' }
  }

  // Visa 10.5 has no normal evidence remedy even though Stripe's API reason is fraudulent.
  if (disputeCase.paymentMethodDetailsCardNetworkReasonCode === '10.5') {
    return { action: 'ignore', reason: 'visa_10_5_no_remedy' }
  }

  if (!disputeCase.evidenceDetailsDueBy) {
    return { action: 'needs_input', reason: 'no_usable_evidence_deadline' }
  }

  if (disputeCase.evidenceDetailsDueBy.serialize().getTime() <= now.getTime()) {
    return { action: 'deadline_missed', reason: 'evidence_deadline_past' }
  }

  if (coreFraudAdjacentReasons.has(disputeCase.reason)) {
    return { action: 'continue_to_enrichment', reason: 'card_fraud_adjacent' }
  }

  if (reviewOnlyReasons.has(disputeCase.reason) || disputeCase.reason === 'general') {
    return {
      action: 'needs_input',
      reason: disputeCase.reason === 'general' ? 'general_reason' : 'review_only_reason',
    }
  }

  return { action: 'ignore', reason: 'post_mvp_reason' }
}

function applyTriageDecision(
  disputeCase: DisputeCase,
  decision: DisputeTriageDecision,
  now: Date,
): void {
  switch (decision.action) {
    case 'ignore':
      disputeCase.markIgnored(decision.reason, now)
      return
    case 'needs_input':
      disputeCase.markNeedsInput(
        [
          {
            code: decision.reason,
            message: getTriageNeedsInputMessage(decision.reason),
          },
        ],
        now,
      )
      return
    case 'deadline_missed':
      disputeCase.markDeadlineMissed(now)
      return
    case 'continue_to_enrichment':
      disputeCase.markTriaged(now)
      return
    default:
      return assertNever(decision)
  }
}

function getTriageNeedsInputMessage(
  reason: Extract<DisputeTriageDecision, { action: 'needs_input' }>['reason'],
): string {
  switch (reason) {
    case 'general_reason':
      return 'Stripe dispute reason is too general for autopilot'
    case 'review_only_reason':
      return 'Dispute reason is review-only for MVP'
    case 'no_usable_evidence_deadline':
      return 'Stripe did not provide a usable evidence response deadline'
    default:
      return assertNever(reason)
  }
}

function assertNever(value: never): never {
  // Exhaustiveness guard: reaching this means code and the triage union are out of sync.
  throw new Error(`Unhandled dispute triage value: ${JSON.stringify(value)}`)
}
