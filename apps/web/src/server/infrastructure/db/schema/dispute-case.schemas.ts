import type { DisputeCaseWorkflowState } from '@server/domain/disputes'
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'

export const disputeCases = pgTable(
  'dispute_cases',
  {
    id: text('id').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    stripeAccountId: text('stripe_account_id').notNull(),

    stripeStatus: text('stripe_status').notNull(),
    reason: text('reason').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    evidenceDueBy: timestamp('evidence_due_by', { withTimezone: true }).notNull(),
    workflowState: jsonb('workflow_state').$type<DisputeCaseWorkflowState>().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index('dispute_cases_user_id_idx').on(table.userId),
    index('dispute_cases_stripe_account_id_idx').on(table.stripeAccountId),
    index('dispute_cases_stripe_status_idx').on(table.stripeStatus),
    index('dispute_cases_evidence_due_by_idx').on(table.evidenceDueBy),
  ],
)

export type DbDisputeCase = typeof disputeCases.$inferSelect
export type DbNewDisputeCase = typeof disputeCases.$inferInsert
