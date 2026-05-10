import type { CurrencyCode } from '@riposte/core'
import type { StripeSubscriptionItemSnapshot } from '@server/domain/disputes'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { disputeCases } from './dispute-case.schemas'

export const stripeDisputeContexts = pgTable('stripe_dispute_contexts', {
  disputeCaseId: text('dispute_case_id')
    .primaryKey()
    .references(() => disputeCases.id, { onDelete: 'cascade' }),

  chargeId: text('charge_id').notNull(),
  paymentIntentId: text('payment_intent_id'),
  chargeCreatedAt: timestamp('charge_created_at', { withTimezone: true }).notNull(),
  chargeReceiptUrl: text('charge_receipt_url'),

  stripeCustomerId: text('stripe_customer_id'),
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),

  invoiceId: text('invoice_id'),
  invoicePdfUrl: text('invoice_pdf_url'),

  subscriptionId: text('subscription_id'),
  subscriptionStatus: text('subscription_status'),
  subscriptionItems: jsonb('subscription_items').$type<StripeSubscriptionItemSnapshot[]>(),

  totalPaidByCurrency:
    jsonb('total_paid_by_currency').$type<Partial<Record<CurrencyCode, number>>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
})

export type DbStripeDisputeContext = typeof stripeDisputeContexts.$inferSelect
export type DbNewStripeDisputeContext = typeof stripeDisputeContexts.$inferInsert
