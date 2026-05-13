import {
  ValidationError,
  createEvent,
  currencyCodeSchema,
  stripeDisputeStatusSchema,
} from '@riposte/core'
import type {
  ContestDecisionKind,
  ContestDecisionReason,
  CurrencyCode,
  DisputeCaseCompletionReason,
  DisputeCaseHumanActionReason,
  DisputeCaseWorkflowState,
  DisputeCaseWorkflowStatus,
  MissingEvidence,
  StripeDisputeStatus,
  UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import { Result } from 'better-result'
import { z } from 'zod'

import { Deadline } from './deadline.vo'
import { type StripeDisputeId, stripeDisputeIdSchema } from './dispute.schemas'
import { Money } from './money.vo'

export type DisputeCaseId = StripeDisputeId

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
  contestDecision: ContestDecisionKind
  contestDecisionReason: ContestDecisionReason | null
  contestDecisionDecidedAt: Date | null
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
    private contestDecision: ContestDecisionKind,
    private contestDecisionReason: ContestDecisionReason | null,
    private contestDecisionDecidedAt: Date | null,
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
      'undecided',
      null,
      null,
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
      snapshot.contestDecisionReason,
      snapshot.contestDecisionDecidedAt ? cloneDate(snapshot.contestDecisionDecidedAt) : null,
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

  getMissingEvidence(): MissingEvidence[] {
    return this.state.status === 'awaiting_human' ? [...this.state.missingEvidence] : []
  }

  getEvidencePacketId(): UUIDv4 | null {
    return this.state.status === 'awaiting_human' ? this.state.evidencePacketId : null
  }

  getFailureReason(): string | null {
    return this.state.status === 'failed' ? this.state.reason : null
  }

  getContestDecision(): {
    decision: ContestDecisionKind
    reason: ContestDecisionReason | null
    decidedAt: Date | null
  } {
    return {
      decision: this.contestDecision,
      reason: this.contestDecisionReason,
      decidedAt: this.contestDecisionDecidedAt ? cloneDate(this.contestDecisionDecidedAt) : null,
    }
  }

  getEvidenceDetailsDueBy(): Date | null {
    return this.evidenceDetailsDueBy ? cloneDate(this.evidenceDetailsDueBy.serialize()) : null
  }

  markEvaluated(now: Date = new Date()): void {
    this.ensureStatus(['received'], 'mark evaluated')
    this.state = { status: 'evaluated', evaluatedAt: cloneDate(now) }
    this.touch(now)
  }

  startEvidenceCollection(now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'awaiting_human'], 'start evidence collection')
    this.state = { status: 'collecting_evidence', startedAt: cloneDate(now) }
    this.touch(now)
  }

  awaitHumanInput(
    args: {
      reason: DisputeCaseHumanActionReason
      missingEvidence?: MissingEvidence[]
      evidencePacketId?: UUIDv4 | null
    },
    now: Date = new Date(),
  ): void {
    this.ensureStatus(['evaluated', 'collecting_evidence'], 'await human input')
    const missingEvidence = args.missingEvidence ?? []
    this.state = {
      status: 'awaiting_human',
      reason: args.reason,
      missingEvidence: missingEvidence.map((item) => ({
        code: requireNonBlank(item.code, 'missingEvidence.code'),
        message: requireNonBlank(item.message, 'missingEvidence.message'),
      })),
      evidencePacketId: args.evidencePacketId ?? null,
      requestedAt: cloneDate(now),
    }
    this.touch(now)
  }

  setContestDecision(
    decision: Exclude<ContestDecisionKind, 'undecided'>,
    reason: ContestDecisionReason,
    now: Date = new Date(),
  ): void {
    this.contestDecision = decision
    this.contestDecisionReason = reason
    this.contestDecisionDecidedAt = cloneDate(now)
    this.touch(now)
  }

  complete(reason: DisputeCaseCompletionReason, now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'collecting_evidence', 'awaiting_human'], 'complete')
    this.state = { status: 'completed', reason, completedAt: cloneDate(now) }
    this.touch(now)
  }

  markFailed(reason: string, now: Date = new Date()): void {
    this.ensureStatus(['evaluated', 'collecting_evidence', 'awaiting_human'], 'mark failed')

    this.state = { status: 'failed', reason: requireNonBlank(reason, 'failureReason') }
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
      contestDecisionReason: this.contestDecisionReason,
      contestDecisionDecidedAt: this.contestDecisionDecidedAt
        ? cloneDate(this.contestDecisionDecidedAt)
        : null,
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
