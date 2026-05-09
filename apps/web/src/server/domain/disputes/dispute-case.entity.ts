import {
  ValidationError,
  createEvent,
  currencyCodeSchema,
  stripeDisputeStatusSchema,
} from '@riposte/core'
import type {
  CurrencyCode,
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
  stripeStatus: StripeDisputeStatus
  reason: string
  amountMinor: number
  currency: CurrencyCode
  evidenceDueBy: Date
  workflowState: DisputeCaseWorkflowState
  stripeCreatedAt: Date
  updatedAt: Date
}

export type ReceiveStripeDisputeInput = {
  userId: string
  stripeAccountId: string
  stripeDispute: unknown
  now?: Date
}

const stripeDisputeObjectSchema = z.object({
  id: z.string().min(1),
  amount: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
  reason: z.string().min(1),
  status: stripeDisputeStatusSchema,
  evidence_details: z.object({
    due_by: z.number().int().nullable(),
  }),
})

export class DisputeCase extends Entity<DisputeCaseSnapshot> {
  private constructor(
    readonly id: DisputeCaseId,
    readonly userId: string,
    readonly stripeAccountId: string,
    readonly stripeStatus: StripeDisputeStatus,
    readonly reason: string,
    readonly amount: Money,
    readonly evidenceDueBy: Deadline,
    private state: DisputeCaseWorkflowState,
    readonly stripeCreatedAt: Date,
    private updatedAt: Date,
  ) {
    super()
  }

  static receiveStripeDispute(
    input: ReceiveStripeDisputeInput,
  ): Result<DisputeCase, ValidationError> {
    const parsed = stripeDisputeObjectSchema.safeParse(input.stripeDispute)
    if (!parsed.success) {
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

    const stripeDispute = parsed.data
    const now = cloneDate(input.now ?? new Date())

    if (!stripeDispute.evidence_details.due_by || stripeDispute.evidence_details.due_by <= 0) {
      return Result.err(
        new ValidationError({
          issues: [
            {
              code: 'stripe_dispute_response_deadline_missing',
              path: ['evidence_details', 'due_by'],
              message: 'Stripe dispute response deadline is missing',
            },
          ],
          message: 'Stripe dispute response deadline is missing',
        }),
      )
    }

    const disputeCase = new DisputeCase(
      stripeDisputeIdSchema.parse(stripeDispute.id),
      requireNonBlank(input.userId, 'userId'),
      requireNonBlank(input.stripeAccountId, 'stripeAccountId'),
      stripeDispute.status,
      requireNonBlank(stripeDispute.reason, 'reason'),
      Money.create({
        amountMinor: stripeDispute.amount,
        currency: stripeDispute.currency,
      }),
      Deadline.create(new Date(stripeDispute.evidence_details.due_by * 1000)),
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
      snapshot.stripeStatus,
      requireNonBlank(snapshot.reason, 'reason'),
      Money.deserialize({ amountMinor: snapshot.amountMinor, currency: snapshot.currency }),
      Deadline.deserialize(snapshot.evidenceDueBy),
      snapshot.workflowState,
      cloneDate(snapshot.stripeCreatedAt),
      cloneDate(snapshot.updatedAt),
    )
  }

  getStatus(): DisputeCaseWorkflowStatus {
    return this.state.status
  }

  getState(): DisputeCaseWorkflowState {
    return this.state
  }

  getMissingEvidence(): MissingEvidence[] {
    return this.state.status === 'needs_input' ? [...this.state.missingEvidence] : []
  }

  getEvidencePacketId(): UUIDv4 | null {
    return this.state.status === 'ready_for_review' ? this.state.evidencePacketId : null
  }

  getFailureReason(): string | null {
    return this.state.status === 'failed' ? this.state.reason : null
  }

  startEvidenceCollection(now: Date = new Date()): void {
    this.ensureStatus(['received', 'needs_input'], 'start evidence collection')
    this.state = { status: 'collecting_evidence', startedAt: cloneDate(now) }
    this.touch(now)
  }

  markNeedsInput(missingEvidence: MissingEvidence[], now: Date = new Date()): void {
    this.ensureStatus(['collecting_evidence'], 'mark needs input')

    if (missingEvidence.length === 0) {
      throw validationError('missingEvidence', 'Missing evidence must include at least one item')
    }

    this.state = {
      status: 'needs_input',
      missingEvidence: missingEvidence.map((item) => ({
        code: requireNonBlank(item.code, 'missingEvidence.code'),
        message: requireNonBlank(item.message, 'missingEvidence.message'),
      })),
    }
    this.touch(now)
  }

  markReadyForReview(evidencePacketId: UUIDv4, now: Date = new Date()): void {
    this.ensureStatus(['collecting_evidence', 'needs_input'], 'mark ready for review')

    this.state = { status: 'ready_for_review', evidencePacketId }
    this.touch(now)
  }

  markFailed(reason: string, now: Date = new Date()): void {
    this.ensureStatus(['collecting_evidence'], 'mark failed')

    this.state = { status: 'failed', reason: requireNonBlank(reason, 'failureReason') }
    this.touch(now)
  }

  serialize(): DisputeCaseSnapshot {
    const money = this.amount.serialize()

    return {
      id: this.id,
      userId: this.userId,
      stripeAccountId: this.stripeAccountId,
      stripeStatus: this.stripeStatus,
      reason: this.reason,
      amountMinor: money.amountMinor,
      currency: money.currency,
      evidenceDueBy: cloneDate(this.evidenceDueBy.serialize()),
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
