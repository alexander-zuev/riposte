import type { ContestDecision, CurrencyCode, StripeDisputeStatus } from '@riposte/core'
import type { DisputeCaseWorkflowState } from '@server/domain/disputes'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'

export const disputeCases = pgTable(
  'dispute_cases',
  {
    id: text('id').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    stripeAccountId: text('stripe_account_id').notNull(),
    sourceStripeEventId: text('source_stripe_event_id').notNull(),
    sourceStripeEventType: text('source_stripe_event_type').notNull(),
    livemode: boolean('livemode').notNull(),

    stripeStatus: text('stripe_status').$type<StripeDisputeStatus>().notNull(),
    reason: text('reason').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').$type<CurrencyCode>().notNull(),
    charge: text('charge').notNull(),
    paymentIntent: text('payment_intent'),
    paymentMethodDetailsType: text('payment_method_details_type'),
    paymentMethodDetailsCardBrand: text('payment_method_details_card_brand'),
    paymentMethodDetailsCardCaseType: text('payment_method_details_card_case_type'),
    paymentMethodDetailsCardNetworkReasonCode: text(
      'payment_method_details_card_network_reason_code',
    ),
    customerPurchaseIp: text('customer_purchase_ip'),
    metadata: jsonb('metadata').$type<Record<string, string>>().notNull(),
    balanceTransaction: text('balance_transaction'),
    balanceTransactions: jsonb('balance_transactions').$type<unknown[]>().notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    enhancedEligibilityTypes: jsonb('enhanced_eligibility_types').$type<string[]>().notNull(),
    evidenceDetailsEnhancedEligibility: jsonb('evidence_details_enhanced_eligibility')
      .$type<Record<string, unknown>>()
      .notNull(),
    evidenceDetailsDueBy: timestamp('evidence_details_due_by', { withTimezone: true }),
    evidenceDetailsHasEvidence: boolean('evidence_details_has_evidence').notNull(),
    evidenceDetailsPastDue: boolean('evidence_details_past_due').notNull(),
    evidenceDetailsSubmissionCount: integer('evidence_details_submission_count').notNull(),
    isChargeRefundable: boolean('is_charge_refundable').notNull(),
    contestDecision: jsonb('contest_decision').$type<ContestDecision>().notNull(),
    workflowState: jsonb('workflow_state').$type<DisputeCaseWorkflowState>().notNull(),

    stripeCreatedAt: timestamp('stripe_created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index('dispute_cases_user_id_idx').on(table.userId),
    index('dispute_cases_stripe_account_id_idx').on(table.stripeAccountId),
    index('dispute_cases_stripe_status_idx').on(table.stripeStatus),
    index('dispute_cases_evidence_due_by_idx').on(table.evidenceDetailsDueBy),
  ],
)

export type DbDisputeCase = typeof disputeCases.$inferSelect
export type DbNewDisputeCase = typeof disputeCases.$inferInsert
