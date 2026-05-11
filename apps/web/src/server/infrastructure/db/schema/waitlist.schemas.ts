import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  productType: text('product_type'),
  usesStripe: boolean('uses_stripe'),
  hasDisputes: text('has_disputes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DbWaitlist = typeof waitlist.$inferSelect
export type DbNewWaitlist = typeof waitlist.$inferInsert
