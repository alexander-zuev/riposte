import { ValidationError, createEvent } from '@riposte/core'
import type { UUIDv4 } from '@riposte/core'

import { Entity } from '../models/base.models'
import { Deadline } from './deadline.vo'
import { stripeDisputeIdSchema } from './dispute.schemas'
import { Money } from './money.vo'

export type DisputeCaseStatus =
  | 'received'
  | 'collecting_evidence'
  | 'needs_input'
  | 'ready_for_review'
  | 'submitted'
  | 'accepted'
  | 'deadline_missed'
  | 'won'
  | 'lost'
  | 'failed'

export type MissingEvidence = {
  code: string
  message: string
}

export type DisputeCaseState =
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

export type SerializedDisputeCase = {
  id: UUIDv4
  stripeDisputeId: string
  reason: string
  amountMinor: number
  currency: string
  evidenceDueBy: Date
  state: DisputeCaseState
  createdAt: Date
  updatedAt: Date
}

export type CreateDisputeCaseInput = {
  id: UUIDv4
  stripeDisputeId: string
  reason: string
  amount: {
    amountMinor: number
    currency: string
  }
  evidenceDueBy: Date | string
  now?: Date
}

export class DisputeCase extends Entity<SerializedDisputeCase> {
  private constructor(
    readonly id: UUIDv4,
    readonly stripeDisputeId: string,
    readonly reason: string,
    readonly amount: Money,
    readonly evidenceDueBy: Deadline,
    private state: DisputeCaseState,
    readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super()
  }

  static create(input: CreateDisputeCaseInput): DisputeCase {
    const now = cloneDate(input.now ?? new Date())
    const disputeCase = new DisputeCase(
      input.id,
      stripeDisputeIdSchema.parse(input.stripeDisputeId),
      requireNonBlank(input.reason, 'reason'),
      Money.create(input.amount),
      Deadline.create(input.evidenceDueBy),
      { status: 'received' },
      now,
      now,
    )

    disputeCase.addEvent(
      createEvent('DisputeCaseReceived', {
        disputeCaseId: disputeCase.id,
        stripeDisputeId: disputeCase.stripeDisputeId,
      }),
    )

    return disputeCase
  }

  static deserialize(row: SerializedDisputeCase): DisputeCase {
    return new DisputeCase(
      row.id,
      stripeDisputeIdSchema.parse(row.stripeDisputeId),
      requireNonBlank(row.reason, 'reason'),
      Money.deserialize({ amountMinor: row.amountMinor, currency: row.currency }),
      Deadline.deserialize(row.evidenceDueBy),
      deserializeState(row.state),
      cloneDate(row.createdAt),
      cloneDate(row.updatedAt),
    )
  }

  getStatus(): DisputeCaseStatus {
    return this.state.status
  }

  getState(): DisputeCaseState {
    return cloneState(this.state)
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

  serialize(): SerializedDisputeCase {
    const money = this.amount.serialize()

    return {
      id: this.id,
      stripeDisputeId: this.stripeDisputeId,
      reason: this.reason,
      amountMinor: money.amountMinor,
      currency: money.currency,
      evidenceDueBy: cloneDate(this.evidenceDueBy.serialize()),
      state: cloneState(this.state),
      createdAt: cloneDate(this.createdAt),
      updatedAt: cloneDate(this.updatedAt),
    }
  }

  private ensureStatus(allowed: DisputeCaseStatus[], action: string): void {
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

function cloneState(state: DisputeCaseState): DisputeCaseState {
  switch (state.status) {
    case 'received':
      return { status: 'received' }
    case 'collecting_evidence':
      return { status: 'collecting_evidence', startedAt: cloneDate(state.startedAt) }
    case 'needs_input':
      return { status: 'needs_input', missingEvidence: [...state.missingEvidence] }
    case 'ready_for_review':
      return { status: 'ready_for_review', evidencePacketId: state.evidencePacketId }
    case 'submitted':
      return {
        status: 'submitted',
        evidencePacketId: state.evidencePacketId,
        submittedAt: cloneDate(state.submittedAt),
      }
    case 'accepted':
      return { status: 'accepted', acceptedAt: cloneDate(state.acceptedAt) }
    case 'deadline_missed':
      return { status: 'deadline_missed', missedAt: cloneDate(state.missedAt) }
    case 'won':
      return { status: 'won', decidedAt: cloneDate(state.decidedAt) }
    case 'lost':
      return { status: 'lost', decidedAt: cloneDate(state.decidedAt) }
    case 'failed':
      return { status: 'failed', reason: state.reason }
  }
}

function deserializeState(state: DisputeCaseState): DisputeCaseState {
  switch (state.status) {
    case 'received':
    case 'ready_for_review':
    case 'submitted':
    case 'accepted':
    case 'deadline_missed':
    case 'won':
    case 'lost':
    case 'failed':
      return cloneState(state)
    case 'collecting_evidence':
      return { status: 'collecting_evidence', startedAt: cloneDate(state.startedAt) }
    case 'needs_input':
      if (state.missingEvidence.length === 0) {
        throw validationError(
          'state.missingEvidence',
          'Missing evidence must include at least one item',
        )
      }
      return {
        status: 'needs_input',
        missingEvidence: state.missingEvidence.map((item) => ({
          code: requireNonBlank(item.code, 'state.missingEvidence.code'),
          message: requireNonBlank(item.message, 'state.missingEvidence.message'),
        })),
      }
  }
}
