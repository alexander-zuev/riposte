import type { CurrencyCode, StripePriceRecurringInterval } from '@riposte/core'
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
  brand: string | null
  last4: string | null
  network: string | null
  fingerprint: string | null
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

export type StripeDisputeContext = {
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

export type SaveStripeDisputeContextInput = Omit<StripeDisputeContext, 'createdAt' | 'updatedAt'>
