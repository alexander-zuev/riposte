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

export type StripeDisputeContext = {
  disputeCaseId: string
  chargeId: string
  paymentIntentId: string | null
  chargeCreatedAt: Date
  chargeReceiptUrl: string | null
  stripeCustomerId: string | null
  customerEmail: string | null
  customerName: string | null
  invoiceId: string | null
  invoicePdfUrl: string | null
  subscriptionId: string | null
  subscriptionStatus: string | null
  subscriptionItems: StripeSubscriptionItemSnapshot[] | null
  totalPaidByCurrency: Partial<Record<CurrencyCode, number>> | null
  createdAt: Date
  updatedAt: Date
}

export type SaveStripeDisputeContextInput = Omit<StripeDisputeContext, 'createdAt' | 'updatedAt'>
