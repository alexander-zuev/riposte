import type {
  StripeCardSnapshot,
  StripeChargeSnapshot,
  StripeCustomerSnapshot,
  StripeInvoiceSnapshot,
  StripePaymentHistorySnapshot,
  StripeRefundSnapshot,
  StripeRiskSnapshot,
  StripeSubscriptionSnapshot,
} from '@server/domain/disputes'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'

export const stripeDisputeContexts = pgTable('stripe_dispute_contexts', {
  disputeCaseId: text('dispute_case_id')
    .primaryKey()
    .references(() => disputeCases.id, { onDelete: 'cascade' }),

  charge: jsonb('charge').$type<StripeChargeSnapshot>().notNull(),
  customer: jsonb('customer').$type<StripeCustomerSnapshot>(),
  card: jsonb('card').$type<StripeCardSnapshot>(),
  risk: jsonb('risk').$type<StripeRiskSnapshot>().notNull(),
  invoice: jsonb('invoice').$type<StripeInvoiceSnapshot>(),
  subscription: jsonb('subscription').$type<StripeSubscriptionSnapshot>(),
  refunds: jsonb('refunds').$type<StripeRefundSnapshot[]>().notNull(),
  paymentHistory: jsonb('payment_history').$type<StripePaymentHistorySnapshot>().notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
})

export type DbStripeDisputeContext = typeof stripeDisputeContexts.$inferSelect
export type DbNewStripeDisputeContext = typeof stripeDisputeContexts.$inferInsert
