import type {
  DisputeActivityEvidence,
  DisputeCancellationEvidence,
  DisputeCustomerMatchEvidence,
  DisputeIdentityFactsEvidence,
  DisputeRefundEvidence,
  DisputeUncategorizedEvidence,
  DisputeVisualDeliverablesEvidence,
} from '@server/domain/disputes'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'

export const disputeCollectedEvidence = pgTable('dispute_collected_evidence', {
  disputeCaseId: text('dispute_case_id')
    .primaryKey()
    .references(() => disputeCases.id, { onDelete: 'cascade' }),
  customerMatch: jsonb('customer_match').$type<DisputeCustomerMatchEvidence>(),
  identityFacts: jsonb('identity_facts').$type<DisputeIdentityFactsEvidence>(),
  activityEvidence: jsonb('activity_evidence').$type<DisputeActivityEvidence>(),
  visualDeliverables: jsonb('visual_deliverables').$type<DisputeVisualDeliverablesEvidence>(),
  refundEvidence: jsonb('refund_evidence').$type<DisputeRefundEvidence>(),
  cancellationEvidence: jsonb('cancellation_evidence').$type<DisputeCancellationEvidence>(),
  uncategorizedEvidence: jsonb('uncategorized_evidence').$type<DisputeUncategorizedEvidence>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

export type DbDisputeCollectedEvidence = typeof disputeCollectedEvidence.$inferSelect
export type DbNewDisputeCollectedEvidence = typeof disputeCollectedEvidence.$inferInsert
