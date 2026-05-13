import type { CurrencyCode, StripePriceRecurringInterval } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type Stripe from 'stripe'

export type StripeSubscriptionItemSnapshot = {
  subscriptionItemId: Stripe.SubscriptionItem['id']
  priceId: Stripe.Price['id']
  productId: string
  productName: string | null
  priceNickname: Stripe.Price['nickname']
  amountMinor: Stripe.Price['unit_amount']
  currency: CurrencyCode
  interval: StripePriceRecurringInterval | null
  quantity: Stripe.SubscriptionItem['quantity']
}

export type StripeChargeSnapshot = {
  id: Stripe.Charge['id']
  amount: Stripe.Charge['amount']
  amountCaptured: Stripe.Charge['amount_captured']
  amountRefunded: Stripe.Charge['amount_refunded']
  currency: CurrencyCode
  created: Date
  description: Stripe.Charge['description']
  calculatedStatementDescriptor: Stripe.Charge['calculated_statement_descriptor']
  paymentIntent: string | null
  receiptUrl: Stripe.Charge['receipt_url']
  refunded: Stripe.Charge['refunded']
}

export type StripeCustomerSnapshot = {
  id: Stripe.Customer['id']
  email: Stripe.Customer['email']
  name: Stripe.Customer['name']
}

export type StripeCardSnapshot = {
  paymentMethodId: string | null
  brand: string | null
  last4: string | null
  network: string | null
  fingerprint: string | null
  country: string | null
  funding: string | null
  expMonth: number | null
  expYear: number | null
  networkTransactionId: string | null
  checks: {
    addressLine1Check: string | null
    addressPostalCodeCheck: string | null
    cvcCheck: string | null
  } | null
  threeDSecure: {
    result: string | null
    resultReason: string | null
    version: string | null
  } | null
}

export type StripeRiskSnapshot = {
  level: string | null
  score: number | null
  outcomeType: string | null
  outcomeReason: string | null
  review: {
    id: Stripe.Review['id']
    open: Stripe.Review['open']
    reason: Stripe.Review['reason']
    closedReason: Stripe.Review['closed_reason']
    ipAddress: Stripe.Review['ip_address']
    ipAddressLocation: Stripe.Review['ip_address_location']
  } | null
}

export type StripeInvoiceSnapshot = {
  id: Stripe.Invoice['id']
  number: Stripe.Invoice['number']
  status: Stripe.Invoice['status']
  currency: CurrencyCode
  subtotal: Stripe.Invoice['subtotal']
  total: Stripe.Invoice['total']
  amountPaid: Stripe.Invoice['amount_paid']
  amountDue: Stripe.Invoice['amount_due']
  amountRemaining: Stripe.Invoice['amount_remaining']
  invoicePdf: Stripe.Invoice['invoice_pdf']
  hostedInvoiceUrl: Stripe.Invoice['hosted_invoice_url']
  created: Date
}

export type StripeSubscriptionSnapshot = {
  id: Stripe.Subscription['id']
  status: Stripe.Subscription['status']
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAt: Date | null
  canceledAt: Date | null
  items: StripeSubscriptionItemSnapshot[]
}

export type StripeRefundSnapshot = {
  id: Stripe.Refund['id']
  amount: Stripe.Refund['amount']
  currency: CurrencyCode
  status: Stripe.Refund['status']
  reason: Stripe.Refund['reason']
  created: Date
}

export type StripePriorChargeSnapshot = {
  id: Stripe.Charge['id']
  amount: Stripe.Charge['amount']
  amountCaptured: Stripe.Charge['amount_captured']
  amountRefunded: Stripe.Charge['amount_refunded']
  currency: CurrencyCode
  created: Date
  paid: Stripe.Charge['paid']
  disputed: Stripe.Charge['disputed']
  refunded: Stripe.Charge['refunded']
  card: {
    last4: string | null
    network: string | null
    fingerprint: string | null
  } | null
  receiptUrl: Stripe.Charge['receipt_url']
}

export type StripePaymentHistorySnapshot = {
  priorCharges: StripePriorChargeSnapshot[]
  totalPaidByCurrency: Partial<Record<CurrencyCode, number>>
}

export type StripeDisputeContextSnapshot = {
  disputeCaseId: string
  charge: StripeChargeSnapshot
  customer: StripeCustomerSnapshot | null
  card: StripeCardSnapshot | null
  risk: StripeRiskSnapshot
  invoice: StripeInvoiceSnapshot | null
  subscription: StripeSubscriptionSnapshot | null
  refunds: StripeRefundSnapshot[]
  paymentHistory: StripePaymentHistorySnapshot
  createdAt: Date
  updatedAt: Date
}

export type SaveStripeDisputeContextInput = Omit<
  StripeDisputeContextSnapshot,
  'createdAt' | 'updatedAt'
>

export class StripeDisputeContext extends Entity<StripeDisputeContextSnapshot> {
  readonly id: string

  private constructor(
    readonly disputeCaseId: string,
    readonly charge: StripeChargeSnapshot,
    readonly customer: StripeCustomerSnapshot | null,
    readonly card: StripeCardSnapshot | null,
    readonly risk: StripeRiskSnapshot,
    readonly invoice: StripeInvoiceSnapshot | null,
    readonly subscription: StripeSubscriptionSnapshot | null,
    readonly refunds: StripeRefundSnapshot[],
    readonly paymentHistory: StripePaymentHistorySnapshot,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    super()
    this.id = disputeCaseId
  }

  static create(input: SaveStripeDisputeContextInput, now = new Date()): StripeDisputeContext {
    return new StripeDisputeContext(
      input.disputeCaseId,
      input.charge,
      input.customer,
      input.card,
      input.risk,
      input.invoice,
      input.subscription,
      input.refunds,
      input.paymentHistory,
      now,
      now,
    )
  }

  static deserialize(snapshot: StripeDisputeContextSnapshot): StripeDisputeContext {
    return new StripeDisputeContext(
      snapshot.disputeCaseId,
      {
        ...snapshot.charge,
        created: date(snapshot.charge.created),
      },
      snapshot.customer,
      snapshot.card,
      snapshot.risk,
      snapshot.invoice
        ? {
            ...snapshot.invoice,
            created: date(snapshot.invoice.created),
          }
        : null,
      snapshot.subscription
        ? {
            ...snapshot.subscription,
            cancelAt: snapshot.subscription.cancelAt ? date(snapshot.subscription.cancelAt) : null,
            canceledAt: snapshot.subscription.canceledAt
              ? date(snapshot.subscription.canceledAt)
              : null,
            currentPeriodEnd: snapshot.subscription.currentPeriodEnd
              ? date(snapshot.subscription.currentPeriodEnd)
              : null,
            currentPeriodStart: snapshot.subscription.currentPeriodStart
              ? date(snapshot.subscription.currentPeriodStart)
              : null,
          }
        : null,
      snapshot.refunds.map((refund) => ({
        ...refund,
        created: date(refund.created),
      })),
      {
        ...snapshot.paymentHistory,
        priorCharges: snapshot.paymentHistory.priorCharges.map((charge) => ({
          ...charge,
          created: date(charge.created),
        })),
      },
      date(snapshot.createdAt),
      date(snapshot.updatedAt),
    )
  }

  serialize(): StripeDisputeContextSnapshot {
    return {
      disputeCaseId: this.disputeCaseId,
      charge: this.charge,
      customer: this.customer,
      card: this.card,
      risk: this.risk,
      invoice: this.invoice,
      subscription: this.subscription,
      refunds: this.refunds,
      paymentHistory: this.paymentHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

function date(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}
