import {
  DISPUTE_REASON_WORKFLOW,
  ValidationError,
  createEvent,
  currencyCodeSchema,
  stripeDisputeReasonSchema,
  stripeDisputeStatusSchema,
} from '@riposte/core'
import type {
  ContestDecision,
  ContestDecisionCode,
  CurrencyCode,
  DisputeCaseWorkflowStatus,
  StripeDisputeStatus,
  UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import { Result } from 'better-result'
import { z } from 'zod'

import { Deadline } from './deadline.vo'
import type { EvidenceQuality } from './dispute-evidence-packet.entity'
import { type StripeDisputeId, stripeDisputeIdSchema } from './dispute.schemas'
import { Money } from './money.vo'

export type DisputeCaseId = StripeDisputeId

export type MissingEvidence = {
  code: string
  message: string
}

export const DISPUTE_HUMAN_REQUEST_KINDS = ['triage_review', 'submission_approval'] as const

export type DisputeHumanRequestKind = (typeof DISPUTE_HUMAN_REQUEST_KINDS)[number]

export type DisputeSubmissionApprovalCode = 'evidence_quality_low' | 'evidence_quality_medium'

type ApprovalRequiredEvidenceQuality = Exclude<EvidenceQuality, 'high'>

export type DisputeHumanRequest =
  | {
      kind: 'triage_review'
      code: ContestDecisionCode
      requestedAt: Date
      allowedResponses: readonly ['continue', 'no_response']
    }
  | {
      kind: 'submission_approval'
      code: DisputeSubmissionApprovalCode
      evidencePacketId: UUIDv4
      requestedAt: Date
      allowedResponses: readonly ['submit', 'replace_packet', 'decline']
    }

export type DisputeHumanResponse =
  | { kind: 'triage_review'; action: 'continue' | 'no_response' }
  | {
      kind: 'submission_approval'
      action: 'submit' | 'no_response'
      evidencePacketId: UUIDv4
    }

export const DISPUTE_CASE_COMPLETION_REASONS = [
  'contest_submitted',
  'accept_submitted',
  'no_response',
  'deadline_missed',
] as const

export type DisputeCaseCompletionReason = (typeof DISPUTE_CASE_COMPLETION_REASONS)[number]

export type DisputeCaseWorkflowState =
  | { status: 'received' }
  | { status: 'evaluated'; evaluatedAt: Date }
  | { status: 'collecting_evidence'; startedAt: Date }
  | {
      status: 'awaiting_human'
      request: DisputeHumanRequest
    }
  | { status: 'completed'; reason: DisputeCaseCompletionReason; completedAt: Date }
  | { status: 'failed'; reason: string }

export type DisputeCaseEvaluation =
  | { action: 'contest'; code: ContestDecisionCode; canGenerateEvidencePacket: boolean }
  | { action: 'accept'; code: ContestDecisionCode }
  | { action: 'no_response'; code: ContestDecisionCode }

export type DisputeCaseSnapshot = {
  id: DisputeCaseId
  userId: string
  stripeAccountId: string
  sourceStripeEventId: string
  sourceStripeEventType: string
  livemode: boolean
  stripeStatus: StripeDisputeStatus
  reason: string
  amountMinor: number
  currency: CurrencyCode
  charge: string
  paymentIntent: string | null
  paymentMethodDetailsType: string | null
  paymentMethodDetailsCardBrand: string | null
  paymentMethodDetailsCardCaseType: string | null
  paymentMethodDetailsCardNetworkReasonCode: string | null
  customerPurchaseIp: string | null
  metadata: Record<string, string>
  balanceTransaction: string | null
  balanceTransactions: unknown[]
  evidence: Record<string, unknown>
  enhancedEligibilityTypes: string[]
  evidenceDetailsEnhancedEligibility: Record<string, unknown>
  evidenceDetailsDueBy: Date | null
  evidenceDetailsHasEvidence: boolean
  evidenceDetailsPastDue: boolean
  evidenceDetailsSubmissionCount: number
  isChargeRefundable: boolean
  contestDecision: ContestDecision
  workflowState: DisputeCaseWorkflowState
  stripeCreatedAt: Date
  updatedAt: Date
}

export type ReceiveStripeDisputeInput = {
  userId: string
  stripeAccountId: string
  sourceStripeEventId: string
  sourceStripeEventType: string
  stripeDispute: unknown
  now?: Date
}

const expandableIdSchema = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1) }).passthrough(),
])

const stripeDisputeObjectSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  charge: expandableIdSchema,
  created: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  balance_transaction: z.string().min(1).nullable().optional(),
  balance_transactions: z.array(z.unknown()).optional().default([]),
  metadata: z.record(z.string(), z.string()).optional().default({}),
  enhanced_eligibility_types: z.array(z.string().min(1)).optional().default([]),
  is_charge_refundable: z.boolean(),
  livemode: z.boolean(),
  payment_intent: expandableIdSchema.nullable().optional(),
  payment_method_details: z
    .object({
      type: z.string().min(1).nullable().optional(),
      card: z
        .object({
          brand: z.string().min(1).nullable().optional(),
          case_type: z.string().min(1).nullable().optional(),
          network_reason_code: z.string().min(1).nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  reason: z.string().min(1),
  status: stripeDisputeStatusSchema,
  evidence_details: z.object({
    due_by: z.number().int().nullable(),
    enhanced_eligibility: z.record(z.string(), z.unknown()).optional().default({}),
    has_evidence: z.boolean(),
    past_due: z.boolean(),
    submission_count: z.number().int().nonnegative(),
  }),
  evidence: z.record(z.string(), z.unknown()).optional().default({}),
})

export class DisputeCase extends Entity<DisputeCaseSnapshot> {
  private constructor(
    readonly id: DisputeCaseId,
    readonly userId: string,
    readonly stripeAccountId: string,
    readonly sourceStripeEventId: string,
    readonly sourceStripeEventType: string,
    readonly livemode: boolean,
    private stripeStatus: StripeDisputeStatus,
    readonly reason: string,
    readonly amount: Money,
    readonly charge: string,
    readonly paymentIntent: string | null,
    readonly paymentMethodDetailsType: string | null,
    readonly paymentMethodDetailsCardBrand: string | null,
    readonly paymentMethodDetailsCardCaseType: string | null,
    readonly paymentMethodDetailsCardNetworkReasonCode: string | null,
    private customerPurchaseIp: string | null,
    private metadata: Record<string, string>,
    private balanceTransaction: string | null,
    private balanceTransactions: unknown[],
    private evidence: Record<string, unknown>,
    private enhancedEligibilityTypes: string[],
    private evidenceDetailsEnhancedEligibility: Record<string, unknown>,
    private evidenceDetailsDueBy: Deadline | null,
    private evidenceDetailsHasEvidence: boolean,
    private evidenceDetailsPastDue: boolean,
    private evidenceDetailsSubmissionCount: number,
    private isChargeRefundable: boolean,
    private contestDecision: ContestDecision,
    private state: DisputeCaseWorkflowState,
    readonly stripeCreatedAt: Date,
    private updatedAt: Date,
  ) {
    super()
  }

  static receiveStripeDispute(
    input: ReceiveStripeDisputeInput,
  ): Result<DisputeCase, ValidationError> {
    const parsed = parseStripeDisputeObject(input.stripeDispute)
    if (parsed.isErr()) return Result.err(parsed.error)

    const stripeDispute = parsed.value
    const now = cloneDate(input.now ?? new Date())
    const dueBy = stripeDispute.evidence_details.due_by

    const disputeCase = new DisputeCase(
      stripeDisputeIdSchema.parse(stripeDispute.id),
      requireNonBlank(input.userId, 'userId'),
      requireNonBlank(input.stripeAccountId, 'stripeAccountId'),
      requireNonBlank(input.sourceStripeEventId, 'sourceStripeEventId'),
      requireNonBlank(input.sourceStripeEventType, 'sourceStripeEventType'),
      stripeDispute.livemode,
      stripeDispute.status,
      requireNonBlank(stripeDispute.reason, 'reason'),
      Money.create({
        amountMinor: stripeDispute.amount,
        currency: stripeDispute.currency,
      }),
      requireNonBlank(expandableId(stripeDispute.charge), 'charge'),
      expandableIdOrNull(stripeDispute.payment_intent),
      stripeDispute.payment_method_details?.type ?? null,
      stripeDispute.payment_method_details?.card?.brand ?? null,
      stripeDispute.payment_method_details?.card?.case_type ?? null,
      stripeDispute.payment_method_details?.card?.network_reason_code ?? null,
      stringOrNull(stripeDispute.evidence.customer_purchase_ip),
      { ...stripeDispute.metadata },
      stripeDispute.balance_transaction ?? null,
      [...stripeDispute.balance_transactions],
      { ...stripeDispute.evidence },
      [...stripeDispute.enhanced_eligibility_types],
      { ...stripeDispute.evidence_details.enhanced_eligibility },
      dueBy && dueBy > 0 ? Deadline.create(new Date(dueBy * 1000)) : null,
      stripeDispute.evidence_details.has_evidence,
      stripeDispute.evidence_details.past_due,
      stripeDispute.evidence_details.submission_count,
      stripeDispute.is_charge_refundable,
      { status: 'undecided' },
      { status: 'received' },
      new Date(stripeDispute.created * 1000),
      now,
    )

    disputeCase.addEvent(
      createEvent('DisputeCaseReceived', {
        disputeCaseId: disputeCase.id,
        userId: disputeCase.userId,
      }),
    )

    return Result.ok(disputeCase)
  }

  static deserialize(snapshot: DisputeCaseSnapshot): DisputeCase {
    return new DisputeCase(
      stripeDisputeIdSchema.parse(snapshot.id),
      requireNonBlank(snapshot.userId, 'userId'),
      requireNonBlank(snapshot.stripeAccountId, 'stripeAccountId'),
      requireNonBlank(snapshot.sourceStripeEventId, 'sourceStripeEventId'),
      requireNonBlank(snapshot.sourceStripeEventType, 'sourceStripeEventType'),
      snapshot.livemode,
      snapshot.stripeStatus,
      requireNonBlank(snapshot.reason, 'reason'),
      Money.deserialize({ amountMinor: snapshot.amountMinor, currency: snapshot.currency }),
      requireNonBlank(snapshot.charge, 'charge'),
      snapshot.paymentIntent,
      snapshot.paymentMethodDetailsType,
      snapshot.paymentMethodDetailsCardBrand,
      snapshot.paymentMethodDetailsCardCaseType,
      snapshot.paymentMethodDetailsCardNetworkReasonCode,
      snapshot.customerPurchaseIp,
      { ...snapshot.metadata },
      snapshot.balanceTransaction,
      [...snapshot.balanceTransactions],
      { ...snapshot.evidence },
      [...snapshot.enhancedEligibilityTypes],
      { ...snapshot.evidenceDetailsEnhancedEligibility },
      snapshot.evidenceDetailsDueBy ? Deadline.deserialize(snapshot.evidenceDetailsDueBy) : null,
      snapshot.evidenceDetailsHasEvidence,
      snapshot.evidenceDetailsPastDue,
      snapshot.evidenceDetailsSubmissionCount,
      snapshot.isChargeRefundable,
      snapshot.contestDecision,
      snapshot.workflowState,
      cloneDate(snapshot.stripeCreatedAt),
      cloneDate(snapshot.updatedAt),
    )
  }

  refreshStripeDisputeFacts(
    stripeDisputeInput: unknown,
    now: Date = new Date(),
  ): Result<void, ValidationError> {
    const parsed = parseStripeDisputeObject(stripeDisputeInput)
    if (parsed.isErr()) return Result.err(parsed.error)

    const stripeDispute = parsed.value
    if (stripeDispute.id !== this.id) {
      return Result.err(validationError('id', 'Stripe dispute id must match dispute case id'))
    }

    const dueBy = stripeDispute.evidence_details.due_by

    this.stripeStatus = stripeDispute.status
    this.customerPurchaseIp = stringOrNull(stripeDispute.evidence.customer_purchase_ip)
    this.metadata = { ...stripeDispute.metadata }
    this.balanceTransaction = stripeDispute.balance_transaction ?? null
    this.balanceTransactions = [...stripeDispute.balance_transactions]
    this.evidence = { ...stripeDispute.evidence }
    this.enhancedEligibilityTypes = [...stripeDispute.enhanced_eligibility_types]
    this.evidenceDetailsEnhancedEligibility = {
      ...stripeDispute.evidence_details.enhanced_eligibility,
    }
    this.evidenceDetailsDueBy = dueBy && dueBy > 0 ? Deadline.create(new Date(dueBy * 1000)) : null
    this.evidenceDetailsHasEvidence = stripeDispute.evidence_details.has_evidence
    this.evidenceDetailsPastDue = stripeDispute.evidence_details.past_due
    this.evidenceDetailsSubmissionCount = stripeDispute.evidence_details.submission_count
    this.isChargeRefundable = stripeDispute.is_charge_refundable
    this.touch(now)

    return Result.ok(undefined)
  }

  getStatus(): DisputeCaseWorkflowStatus {
    return this.state.status
  }

  getState(): DisputeCaseWorkflowState {
    return this.state
  }

  getHumanRequest(): DisputeHumanRequest | null {
    return this.state.status === 'awaiting_human' ? this.state.request : null
  }

  getFailureReason(): string | null {
    return this.state.status === 'failed' ? this.state.reason : null
  }

  getContestDecision(): ContestDecision {
    return this.contestDecision
  }

  getEvidenceDetailsDueBy(): Date | null {
    return this.evidenceDetailsDueBy ? cloneDate(this.evidenceDetailsDueBy.serialize()) : null
  }

  evaluate(): DisputeCaseEvaluation {
    this.ensureStatus(['received'], 'evaluate')
    const now = new Date()
    const decision = this.determineEvaluation(now)

    switch (decision.action) {
      case 'contest':
        this.recordContestDecision('contest', decision.code, now)
        if (decision.canGenerateEvidencePacket) {
          this.state = { status: 'evaluated', evaluatedAt: cloneDate(now) }
        } else {
          this.state = {
            status: 'awaiting_human',
            request: {
              kind: 'triage_review',
              code: decision.code,
              requestedAt: now,
              allowedResponses: ['continue', 'no_response'],
            },
          }
        }
        this.touch(now)
        return decision
      case 'no_response':
        this.recordContestDecision('no_response', decision.code, now)
        this.markCompleted(
          decision.code === 'evidence_deadline_past' ? 'deadline_missed' : 'no_response',
          now,
        )
        return decision
      case 'accept':
        this.recordContestDecision('accept', decision.code, now)
        this.markCompleted('accept_submitted', now)
        return decision
      default:
        return assertNever(decision)
    }
  }

  private determineEvaluation(now: Date): DisputeCaseEvaluation {
    if (this.paymentMethodDetailsType !== 'card') {
      return { action: 'no_response', code: 'non_card_mvp' }
    }

    if (this.paymentMethodDetailsCardNetworkReasonCode === '10.5') {
      return { action: 'no_response', code: 'visa_10_5_no_remedy' }
    }

    const evidenceDetailsDueBy = this.getEvidenceDetailsDueBy()

    if (!evidenceDetailsDueBy) {
      return { action: 'no_response', code: 'no_usable_evidence_deadline' }
    }

    if (evidenceDetailsDueBy.getTime() <= now.getTime()) {
      return { action: 'no_response', code: 'evidence_deadline_past' }
    }

    const parsedReason = stripeDisputeReasonSchema.safeParse(this.reason)
    if (!parsedReason.success) return { action: 'no_response', code: 'post_mvp_reason' }

    const workflow = DISPUTE_REASON_WORKFLOW[parsedReason.data]
    const policy = workflow.contestPolicy
    if (policy.decision === 'contest') {
      return {
        action: 'contest',
        code: policy.code,
        canGenerateEvidencePacket: workflow.evidencePacket.supported,
      }
    }

    return { action: policy.decision, code: policy.code }
  }

  startEvidenceCollection(now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'awaiting_human'], 'start evidence collection')
    this.state = { status: 'collecting_evidence', startedAt: cloneDate(now) }
    this.touch(now)
  }

  awaitTriageReview(code: ContestDecisionCode, now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'collecting_evidence'], 'await triage review')
    this.state = {
      status: 'awaiting_human',
      request: {
        kind: 'triage_review',
        code,
        requestedAt: now,
        allowedResponses: ['continue', 'no_response'],
      },
    }
    this.touch(now)
  }

  awaitSubmissionApproval(
    args: { evidencePacketId: UUIDv4; evidenceQuality: ApprovalRequiredEvidenceQuality },
    now: Date = new Date(),
  ): void {
    this.ensureStatus(['evaluated', 'collecting_evidence'], 'await submission approval')
    this.state = {
      status: 'awaiting_human',
      request: {
        kind: 'submission_approval',
        code: args.evidenceQuality === 'low' ? 'evidence_quality_low' : 'evidence_quality_medium',
        evidencePacketId: requireNonBlank(args.evidencePacketId, 'evidencePacketId') as UUIDv4,
        requestedAt: now,
        allowedResponses: ['submit', 'replace_packet', 'decline'],
      },
    }
    this.touch(now)
  }

  complete(reason: DisputeCaseCompletionReason, now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'collecting_evidence', 'awaiting_human'], 'complete')
    this.markCompleted(reason, now)
  }

  markFailed(reason: string, now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'collecting_evidence', 'awaiting_human'], 'mark failed')

    const failureReason = requireNonBlank(reason, 'failureReason')
    this.state = { status: 'failed', reason: failureReason }
    this.addEvent(
      createEvent('DisputeCaseFailed', {
        disputeCaseId: this.id,
        userId: this.userId,
        reason: failureReason,
      }),
    )
    this.touch(now)
  }

  serialize(): DisputeCaseSnapshot {
    const money = this.amount.serialize()

    return {
      id: this.id,
      userId: this.userId,
      stripeAccountId: this.stripeAccountId,
      sourceStripeEventId: this.sourceStripeEventId,
      sourceStripeEventType: this.sourceStripeEventType,
      livemode: this.livemode,
      stripeStatus: this.stripeStatus,
      reason: this.reason,
      amountMinor: money.amountMinor,
      currency: money.currency,
      charge: this.charge,
      paymentIntent: this.paymentIntent,
      paymentMethodDetailsType: this.paymentMethodDetailsType,
      paymentMethodDetailsCardBrand: this.paymentMethodDetailsCardBrand,
      paymentMethodDetailsCardCaseType: this.paymentMethodDetailsCardCaseType,
      paymentMethodDetailsCardNetworkReasonCode: this.paymentMethodDetailsCardNetworkReasonCode,
      customerPurchaseIp: this.customerPurchaseIp,
      metadata: { ...this.metadata },
      balanceTransaction: this.balanceTransaction,
      balanceTransactions: [...this.balanceTransactions],
      evidence: { ...this.evidence },
      enhancedEligibilityTypes: [...this.enhancedEligibilityTypes],
      evidenceDetailsEnhancedEligibility: { ...this.evidenceDetailsEnhancedEligibility },
      evidenceDetailsDueBy: this.evidenceDetailsDueBy
        ? cloneDate(this.evidenceDetailsDueBy.serialize())
        : null,
      evidenceDetailsHasEvidence: this.evidenceDetailsHasEvidence,
      evidenceDetailsPastDue: this.evidenceDetailsPastDue,
      evidenceDetailsSubmissionCount: this.evidenceDetailsSubmissionCount,
      isChargeRefundable: this.isChargeRefundable,
      contestDecision: this.contestDecision,
      workflowState: this.state,
      stripeCreatedAt: cloneDate(this.stripeCreatedAt),
      updatedAt: cloneDate(this.updatedAt),
    }
  }

  private ensureStatus(allowed: DisputeCaseWorkflowStatus[], action: string): void {
    if (allowed.includes(this.state.status)) return

    throw validationError(
      'status',
      `Cannot ${action} when dispute case status is ${this.state.status}`,
    )
  }

  private touch(now: Date): void {
    this.updatedAt = cloneDate(now)
  }

  private recordContestDecision(
    status: Exclude<ContestDecision['status'], 'undecided'>,
    code: ContestDecisionCode,
    now: Date,
  ): void {
    this.contestDecision = {
      status,
      code,
      decidedAt: cloneDate(now),
    }
  }

  private markCompleted(reason: DisputeCaseCompletionReason, now: Date): void {
    this.state = { status: 'completed', reason, completedAt: cloneDate(now) }
    this.addEvent(
      createEvent('DisputeCaseCompleted', {
        disputeCaseId: this.id,
        userId: this.userId,
        reason,
      }),
    )
    this.touch(now)
  }
}

function requireNonBlank(value: string, path: string): string {
  const normalized = value.trim()
  if (normalized) return normalized

  throw validationError(path, `${path} must not be blank`)
}

function parseStripeDisputeObject(
  input: unknown,
): Result<z.infer<typeof stripeDisputeObjectSchema>, ValidationError> {
  const parsed = stripeDisputeObjectSchema.safeParse(input)
  if (parsed.success) return Result.ok(parsed.data)

  return Result.err(
    new ValidationError({
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.map((path) => (typeof path === 'symbol' ? String(path) : path)),
        message: issue.message,
      })),
      message: 'Invalid Stripe dispute object',
    }),
  )
}

function expandableId(value: z.infer<typeof expandableIdSchema>): string {
  return typeof value === 'string' ? value : value.id
}

function expandableIdOrNull(
  value: z.infer<typeof expandableIdSchema> | null | undefined,
): string | null {
  if (!value) return null

  return expandableId(value)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function validationError(path: string, message: string): ValidationError {
  return new ValidationError({
    issues: [
      {
        code: 'invalid_dispute_case',
        path: [path],
        message,
      },
    ],
  })
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime())
}

function includes<const T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value)
}

function getEvaluationHumanInputMessage(code: ContestDecisionCode): string {
  switch (code) {
    case 'general_reason':
      return 'Stripe dispute reason is too general for autopilot'
    case 'review_only_reason':
      return 'Dispute reason is review-only for MVP'
    default:
      return `Merchant input is required for contest decision code: ${code}`
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled dispute case evaluation value: ${JSON.stringify(value)}`)
}
