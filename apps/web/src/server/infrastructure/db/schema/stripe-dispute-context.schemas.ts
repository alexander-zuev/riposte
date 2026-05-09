import type { CurrencyCode, StripePriceRecurringInterval } from '@riposte/core'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'

export const stripeDisputeContexts = pgTable('stripe_dispute_contexts', {
  disputeCaseId: text('dispute_case_id')
    .primaryKey()
    .references(() => disputeCases.id, { onDelete: 'cascade' }),

  chargeId: text('charge_id').notNull(),
  paymentIntentId: text('payment_intent_id'),
  chargeCreatedAt: timestamp('charge_created_at', { withTimezone: true }).notNull(),

  stripeCustomerId: text('stripe_customer_id'),
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),

  invoiceId: text('invoice_id'),
  invoicePdfUrl: text('invoice_pdf_url'),

  subscriptionId: text('subscription_id'),
  planName: text('plan_name'),
  planAmountMinor: integer('plan_amount_minor'),
  planCurrency: text('plan_currency').$type<CurrencyCode>(),
  planInterval: text('plan_interval').$type<StripePriceRecurringInterval>(),
  subscriptionStatus: text('subscription_status'),

  totalPaidMinor: integer('total_paid_minor'),
  totalPaidCurrency: text('total_paid_currency').$type<CurrencyCode>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
})

export type DbStripeDisputeContext = typeof stripeDisputeContexts.$inferSelect
export type DbNewStripeDisputeContext = typeof stripeDisputeContexts.$inferInsert
