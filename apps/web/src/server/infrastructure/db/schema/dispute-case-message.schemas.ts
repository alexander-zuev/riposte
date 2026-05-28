import type { DisputeCaseMessageParts, DisputeCaseMessageRole } from '@riposte/core'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'
import { products } from './product.schemas'

/**
 * One row per evidence-collection turn: the AI SDK's assembled UIMessage.
 * `id` is the SDK-assigned message id (a uuidv7); the producer (DO) upserts
 * on it per step and again on turn finish, so the row grows in place.
 *
 * Composite index covers both `/agent` (filter by product) and
 * `/disputes/$caseId` (filter by product + case), ordered by `created_at`.
 */
export const disputeCaseMessages = pgTable(
  'dispute_case_messages',
  {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    disputeCaseId: text('dispute_case_id')
      .notNull()
      .references(() => disputeCases.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').notNull(),
    role: text('role').$type<DisputeCaseMessageRole>().notNull(),
    parts: jsonb('parts').$type<DisputeCaseMessageParts>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('dispute_case_messages_product_case_created_at_idx').on(
      table.productId,
      table.disputeCaseId,
      table.createdAt,
    ),
    index('dispute_case_messages_run_id_idx').on(table.runId),
  ],
)

export type DbDisputeCaseMessage = typeof disputeCaseMessages.$inferSelect
export type DbNewDisputeCaseMessage = typeof disputeCaseMessages.$inferInsert
