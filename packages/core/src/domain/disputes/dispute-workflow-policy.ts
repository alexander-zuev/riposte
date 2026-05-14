import { z } from 'zod'

import type {
  StripeDisputeEvidenceProductType,
  StripeDisputeReason,
  StripeDisputeReasonCodeCategory,
} from './stripe-dispute-taxonomy'

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

export const CONTEST_DECISION_CODES_CONTEST = ['supported_card_fraud_adjacent'] as const

export const CONTEST_DECISION_CODES_NO_RESPONSE = [
  'non_card_mvp',
  'no_normal_contest_path',
  'special_handling_out_of_mvp',
  'post_mvp_reason',
  'visa_10_5_no_remedy',
  'no_usable_evidence_deadline',
  'evidence_deadline_past',
] as const

export const CONTEST_DECISION_CODES_AWAIT_HUMAN = ['general_reason', 'review_only_reason'] as const

export const CONTEST_DECISION_CODES_MERCHANT = ['merchant_declined'] as const

export const CONTEST_DECISION_CODES = [
  ...CONTEST_DECISION_CODES_CONTEST,
  ...CONTEST_DECISION_CODES_NO_RESPONSE,
  ...CONTEST_DECISION_CODES_AWAIT_HUMAN,
  ...CONTEST_DECISION_CODES_MERCHANT,
] as const

export type ContestDecisionCode = (typeof CONTEST_DECISION_CODES)[number]
export const contestDecisionCodeSchema = z.enum(CONTEST_DECISION_CODES)

export type DisputeContestPolicyDecision = Exclude<ContestDecisionKind, 'undecided'>

export type EvidencePacketUnsupportedCode =
  | 'no_normal_contest_path'
  | 'not_implemented'
  | 'special_handling'

export const MERCHANT_DISPUTE_FINDING_OUTCOMES = [
  'supports_merchant_position',
  'does_not_support_merchant_position',
  'needs_more_evidence',
] as const

export type MerchantDisputeFindingOutcome = (typeof MERCHANT_DISPUTE_FINDING_OUTCOMES)[number]
export const merchantDisputeFindingOutcomeSchema = z.enum(MERCHANT_DISPUTE_FINDING_OUTCOMES)

export const MERCHANT_DISPUTE_FINDING_OUTCOME_DETAILS = {
  supports_merchant_position: {
    label: 'Merchant position supported',
  },
  does_not_support_merchant_position: {
    label: 'Merchant position not supported',
  },
  needs_more_evidence: {
    label: 'Needs more evidence',
  },
} as const satisfies Record<MerchantDisputeFindingOutcome, { label: string }>

export type DisputeReasonWorkflow = {
  reasonCodeCategory: StripeDisputeReasonCodeCategory | null
  contestPolicy: {
    decision: DisputeContestPolicyDecision
    code: ContestDecisionCode
  }
  evidencePacket:
    | {
        supported: true
        reasonCodeCategory: StripeDisputeReasonCodeCategory
        productType: StripeDisputeEvidenceProductType
      }
    | {
        supported: false
        code: EvidencePacketUnsupportedCode
      }
}

export const DISPUTE_REASON_WORKFLOW = {
  bank_cannot_process: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'no_normal_contest_path' },
    evidencePacket: { supported: false, code: 'no_normal_contest_path' },
  },
  check_returned: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'special_handling_out_of_mvp' },
    evidencePacket: { supported: false, code: 'special_handling' },
  },
  credit_not_processed: {
    reasonCodeCategory: 'credit_not_processed',
    contestPolicy: { decision: 'no_response', code: 'post_mvp_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  customer_initiated: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'special_handling_out_of_mvp' },
    evidencePacket: { supported: false, code: 'special_handling' },
  },
  debit_not_authorized: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'no_normal_contest_path' },
    evidencePacket: { supported: false, code: 'no_normal_contest_path' },
  },
  duplicate: {
    reasonCodeCategory: 'duplicate',
    contestPolicy: { decision: 'contest', code: 'review_only_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  fraudulent: {
    reasonCodeCategory: 'fraudulent',
    contestPolicy: { decision: 'contest', code: 'supported_card_fraud_adjacent' },
    evidencePacket: {
      supported: true,
      reasonCodeCategory: 'fraudulent',
      productType: 'digital_product_or_service',
    },
  },
  general: {
    reasonCodeCategory: 'general',
    contestPolicy: { decision: 'contest', code: 'general_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  incorrect_account_details: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'no_normal_contest_path' },
    evidencePacket: { supported: false, code: 'no_normal_contest_path' },
  },
  insufficient_funds: {
    reasonCodeCategory: null,
    contestPolicy: { decision: 'no_response', code: 'no_normal_contest_path' },
    evidencePacket: { supported: false, code: 'no_normal_contest_path' },
  },
  noncompliant: {
    reasonCodeCategory: 'noncompliant',
    contestPolicy: { decision: 'no_response', code: 'special_handling_out_of_mvp' },
    evidencePacket: { supported: false, code: 'special_handling' },
  },
  product_not_received: {
    reasonCodeCategory: 'product_not_received',
    contestPolicy: { decision: 'contest', code: 'review_only_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  product_unacceptable: {
    reasonCodeCategory: 'product_unacceptable',
    contestPolicy: { decision: 'no_response', code: 'post_mvp_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  subscription_canceled: {
    reasonCodeCategory: 'subscription_canceled',
    contestPolicy: { decision: 'no_response', code: 'post_mvp_reason' },
    evidencePacket: { supported: false, code: 'not_implemented' },
  },
  unrecognized: {
    reasonCodeCategory: 'unrecognized',
    contestPolicy: { decision: 'contest', code: 'supported_card_fraud_adjacent' },
    evidencePacket: {
      supported: true,
      reasonCodeCategory: 'unrecognized',
      productType: 'digital_product_or_service',
    },
  },
} as const satisfies Record<StripeDisputeReason, DisputeReasonWorkflow>

export type ContestDecision =
  | { status: 'undecided' }
  | {
      status: Exclude<ContestDecisionKind, 'undecided'>
      code: ContestDecisionCode
      decidedAt: Date
    }
