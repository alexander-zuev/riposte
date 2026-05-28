import { createEvent } from '@riposte/core'
import type { UUIDv4 } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'

import type { DisputeCaseId } from './dispute-case.entity'

export type DisputeCustomerMatchEvidence =
  | {
      matched: true
      appUserId: string
      stripeCustomerId: string
      matchedBy: 'stripe_customer_id'
    }
  | {
      matched: false
      reason: string
    }

export type DisputeIdentityFactsEvidence = Record<string, unknown>
export type DisputeActivityEvidence = Record<string, unknown>
export type DisputeVisualDeliverablesEvidence = Record<string, unknown>
export type DisputeRefundEvidence = Record<string, unknown>
export type DisputeCancellationEvidence = Record<string, unknown>
export type DisputeUncategorizedEvidence = Record<string, unknown>

export type DisputeCollectedEvidenceSnapshot = {
  disputeCaseId: DisputeCaseId
  customerMatch: DisputeCustomerMatchEvidence | null
  identityFacts: DisputeIdentityFactsEvidence | null
  activityEvidence: DisputeActivityEvidence | null
  visualDeliverables: DisputeVisualDeliverablesEvidence | null
  refundEvidence: DisputeRefundEvidence | null
  cancellationEvidence: DisputeCancellationEvidence | null
  uncategorizedEvidence: DisputeUncategorizedEvidence | null
  createdAt: Date
  updatedAt: Date
}

export class DisputeCollectedEvidence extends Entity<DisputeCollectedEvidenceSnapshot> {
  private constructor(
    readonly disputeCaseId: DisputeCaseId,
    private customerMatch: DisputeCustomerMatchEvidence | null,
    private identityFacts: DisputeIdentityFactsEvidence | null,
    private activityEvidence: DisputeActivityEvidence | null,
    private visualDeliverables: DisputeVisualDeliverablesEvidence | null,
    private refundEvidence: DisputeRefundEvidence | null,
    private cancellationEvidence: DisputeCancellationEvidence | null,
    private uncategorizedEvidence: DisputeUncategorizedEvidence | null,
    readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super()
  }

  get id(): UUIDv4 {
    return this.disputeCaseId
  }

  static create(disputeCaseId: DisputeCaseId): DisputeCollectedEvidence {
    const now = new Date()
    return new DisputeCollectedEvidence(
      requireNonBlank(disputeCaseId, 'disputeCaseId'),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      now,
      now,
    )
  }

  static deserialize(snapshot: DisputeCollectedEvidenceSnapshot): DisputeCollectedEvidence {
    return new DisputeCollectedEvidence(
      snapshot.disputeCaseId,
      snapshot.customerMatch,
      snapshot.identityFacts,
      snapshot.activityEvidence,
      snapshot.visualDeliverables,
      snapshot.refundEvidence,
      snapshot.cancellationEvidence,
      snapshot.uncategorizedEvidence,
      snapshot.createdAt,
      snapshot.updatedAt,
    )
  }

  recordCustomerMatch(input: DisputeCustomerMatchEvidence, now: Date = new Date()): void {
    this.customerMatch = input
    this.touch(now)
  }

  recordIdentityFacts(input: DisputeIdentityFactsEvidence, now: Date = new Date()): void {
    this.identityFacts = input
    this.touch(now)
  }

  recordActivityEvidence(input: DisputeActivityEvidence, now: Date = new Date()): void {
    this.activityEvidence = input
    this.touch(now)
  }

  recordVisualDeliverables(input: DisputeVisualDeliverablesEvidence, now: Date = new Date()): void {
    this.visualDeliverables = input
    this.touch(now)
  }

  recordRefundEvidence(input: DisputeRefundEvidence, now: Date = new Date()): void {
    this.refundEvidence = input
    this.touch(now)
  }

  recordCancellationEvidence(input: DisputeCancellationEvidence, now: Date = new Date()): void {
    this.cancellationEvidence = input
    this.touch(now)
  }

  recordUncategorizedEvidence(input: DisputeUncategorizedEvidence, now: Date = new Date()): void {
    this.uncategorizedEvidence = input
    this.touch(now)
  }

  complete(now: Date = new Date()): void {
    if (this.customerMatch?.matched !== true) {
      this.addEvent(
        createEvent('DisputeEvidenceCollectionNeedsInput', {
          disputeCaseId: this.disputeCaseId,
          missingInputs: ['customer_match'],
        }),
      )
      this.touch(now)
      return
    }

    this.addEvent(
      createEvent('DisputeEvidenceCollectionCompleted', {
        disputeCaseId: this.disputeCaseId,
      }),
    )
    this.touch(now)
  }

  serialize(): DisputeCollectedEvidenceSnapshot {
    return {
      disputeCaseId: this.disputeCaseId,
      customerMatch: this.customerMatch,
      identityFacts: this.identityFacts,
      activityEvidence: this.activityEvidence,
      visualDeliverables: this.visualDeliverables,
      refundEvidence: this.refundEvidence,
      cancellationEvidence: this.cancellationEvidence,
      uncategorizedEvidence: this.uncategorizedEvidence,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  private touch(now: Date): void {
    this.updatedAt = now
  }
}

function requireNonBlank(value: string, field: string): string {
  if (!value.trim()) {
    throw new Error(`${field} is required`)
  }
  return value
}
