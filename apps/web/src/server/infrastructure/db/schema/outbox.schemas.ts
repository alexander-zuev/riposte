import type { DomainMessage } from '@riposte/core'
import { isNull } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/* -------------------------------------------------------------------------------------------------
 * Message tracking tables for transactional outbox pattern
 * Inbox: Deduplication - tracks processed domain messages
 * Outbox: Relay - stores domain events for async delivery to queue
 *
 * Cleanup Policy (via scheduled cron):
 * - outbox: DELETE WHERE published_at IS NOT NULL AND published_at < NOW() - INTERVAL '7 days'
 * - receipts: DELETE WHERE processed_at < NOW() - INTERVAL '7 days'
 * ----------------------------------------------------------------------------------------------- */

export const messageOutbox = pgTable(
  'message_outbox',
  {
    // unique event ID (idempotency key)
    id: uuid('id').primaryKey(),

    // full serialized event data
    payload: jsonb('payload').$type<DomainMessage>().notNull(),

    // timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [index('outbox_pending_idx').on(table.createdAt).where(isNull(table.publishedAt))],
)

export const messageReceipts = pgTable('message_receipts', {
  messageId: text('message_id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbOutbox = typeof messageOutbox.$inferSelect
export type DbNewOutbox = typeof messageOutbox.$inferInsert
export type DbMsgReceipt = typeof messageReceipts.$inferSelect
export type DbNewMsgReceipt = typeof messageReceipts.$inferInsert
