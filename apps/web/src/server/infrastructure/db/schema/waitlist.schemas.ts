import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DbWaitlist = typeof waitlist.$inferSelect
export type DbNewWaitlist = typeof waitlist.$inferInsert
