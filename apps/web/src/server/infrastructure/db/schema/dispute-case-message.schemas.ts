import type { DisputeCaseMessageParts, DisputeCaseMessageRole } from '@riposte/core'
import { index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'
import { products } from './product.schemas'

/**
 * Append-only audit log of UIMessages emitted by the dispute evidence-collection
 * tool loop. One row per UIMessage; the producer (DO) writes per step.
 *
 * - `id`        — uuidv7 PK assigned by app code (write-clustered)
 * - `messageId` — UIMessage.id; idempotency key inside a dispute case
 * - Composite index covers both `/agent` (filter by product) and
 *   `/disputes/$caseId` (filter by product + case), ordered by `created_at`.
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
    messageId: text('message_id').notNull(),
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
    unique('dispute_case_messages_dispute_case_id_message_id_unique').on(
      table.disputeCaseId,
      table.messageId,
    ),
  ],
)

export type DbDisputeCaseMessage = typeof disputeCaseMessages.$inferSelect
export type DbNewDisputeCaseMessage = typeof disputeCaseMessages.$inferInsert
