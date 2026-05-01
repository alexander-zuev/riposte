import type { DomainMessage } from '@riposte/core'
import { isNull } from 'drizzle-orm'
import { index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

export const messageOutbox = pgTable(
  'message_outbox',
  {
    id: uuid('id').primaryKey(),
    payload: jsonb('payload').$type<DomainMessage>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [index('outbox_pending_idx').on(table.createdAt).where(isNull(table.publishedAt))],
)

export const messageReceipts = pgTable('message_receipts', {
  messageId: uuid('message_id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
})

export type DbOutbox = typeof messageOutbox.$inferSelect
export type DbNewOutbox = typeof messageOutbox.$inferInsert
export type DbMsgReceipt = typeof messageReceipts.$inferSelect
export type DbNewMsgReceipt = typeof messageReceipts.$inferInsert
