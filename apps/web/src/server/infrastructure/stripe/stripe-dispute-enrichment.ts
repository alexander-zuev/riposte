import { currencyCodeSchema, type StripeApiError } from '@riposte/core'
import type {
  DisputeCase,
  SaveStripeDisputeContextInput,
  StripeCardSnapshot,
  StripeChargeSnapshot,
  StripeCustomerSnapshot,
  StripeInvoiceSnapshot,
  StripePaymentHistorySnapshot,
  StripePriorChargeSnapshot,
  StripeRefundSnapshot,
  StripeRiskSnapshot,
  StripeSubscriptionItemSnapshot,
  StripeSubscriptionSnapshot,
} from '@server/domain/disputes'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import Stripe from 'stripe'

export async function fetchStripeDisputeContext(
  stripe: Stripe,
  disputeCase: DisputeCase,
): Promise<Result<SaveStripeDisputeContextInput, StripeApiError>> {
  return await Result.gen(async function* () {
    const dispute = yield* Result.await(
      stripeRequest('disputes.retrieve', () =>
        stripe.disputes.retrieve(disputeCase.id, {
          expand: ['charge', 'charge.customer', 'charge.payment_intent', 'payment_intent'],
        }),
      ),
    )

    const chargeId = objectId(dispute.charge) ?? disputeCase.charge
    const charge =
      expanded<Stripe.Charge>(dispute.charge, 'charge') ??
      (yield* Result.await(
        stripeRequest('charges.retrieve', () =>
          stripe.charges.retrieve(chargeId, { expand: ['customer', 'payment_intent'] }),
        ),
      ))

    const customer = yield* Result.await(resolveCustomer(stripe, charge))
    const invoice = yield* Result.await(resolveInvoice(stripe, customer?.id ?? null, charge))
    const subscription = yield* Result.await(resolveSubscription(stripe, invoice))
    const refunds = yield* Result.await(resolveRefunds(stripe, charge))
    const review = yield* Result.await(resolveReview(stripe, charge))
    const priorCharges = yield* Result.await(resolvePriorCharges(stripe, customer?.id ?? null))

    return Result.ok({
      disputeCaseId: disputeCase.id,
      charge: toChargeSnapshot(charge),
      customer: customer ? toCustomerSnapshot(customer) : null,
      card: toCardSnapshot(charge),
      risk: toRiskSnapshot(charge, review),
      invoice: invoice ? toInvoiceSnapshot(invoice) : null,
      subscription: subscription ? toSubscriptionSnapshot(subscription) : null,
      refunds: refunds.map(toRefundSnapshot),
      paymentHistory: toPaymentHistorySnapshot(priorCharges, charge.id),
    })
  })
}

function resolveCustomer(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Customer | null, StripeApiError>> {
  const customer = charge.customer
  const expandedCustomer = expandedCustomerObject(customer)
  if (expandedCustomer) return Promise.resolve(Result.ok(expandedCustomer))

  const customerId = objectId(customer)
  if (!customerId) return Promise.resolve(Result.ok(null))

  return stripeRequest('customers.retrieve', async () => {
    const found = await stripe.customers.retrieve(customerId)
    return found.deleted ? null : found
  })
}

async function resolveInvoice(
  stripe: Stripe,
  customerId: string | null,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Invoice | null, StripeApiError>> {
  if (!customerId) return Result.ok(null)

  const invoices = await stripeRequest('invoices.list', () =>
    stripe.invoices.list({
      customer: customerId,
      limit: 10,
      expand: ['data.subscription'],
    }),
  )
  if (invoices.isErr()) return Result.err(invoices.error)

  const invoice = invoices.value.data.find((item) => invoiceHasCharge(item, charge.id)) ?? null

  return Result.ok(invoice)
}

function resolveSubscription(
  stripe: Stripe,
  invoice: Stripe.Invoice | null,
): Promise<Result<Stripe.Subscription | null, StripeApiError>> {
  if (!invoice) return Promise.resolve(Result.ok(null))

  const invoiceSubscription = getInvoiceSubscription(invoice)
  if (!invoiceSubscription) return Promise.resolve(Result.ok(null))
  if (typeof invoiceSubscription !== 'string')
    return Promise.resolve(Result.ok(invoiceSubscription))

  return stripeRequest('subscriptions.retrieve', () =>
    stripe.subscriptions.retrieve(invoiceSubscription, {
      expand: ['items.data.price.product'],
    }),
  )
}

async function resolveRefunds(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Refund[], StripeApiError>> {
  if (charge.refunds?.data && !charge.refunds.has_more) return Result.ok(charge.refunds.data)

  const refunds = await stripeRequest('refunds.list', () =>
    stripe.refunds.list({ charge: charge.id, limit: 10 }),
  )
  if (refunds.isErr()) return Result.err(refunds.error)

  return Result.ok(refunds.value.data)
}

function resolveReview(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Review | null, StripeApiError>> {
  const review = charge.review
  const expandedReview = expanded<Stripe.Review>(review, 'review')
  if (expandedReview) return Promise.resolve(Result.ok(expandedReview))

  const reviewId = objectId(review)
  if (!reviewId) return Promise.resolve(Result.ok(null))

  return stripeRequest('reviews.retrieve', () => stripe.reviews.retrieve(reviewId))
}

function resolvePriorCharges(
  stripe: Stripe,
  customerId: string | null,
): Promise<Result<Stripe.Charge[], StripeApiError>> {
  if (!customerId) return Promise.resolve(Result.ok([]))

  return stripeRequest('charges.list', async () => {
    const charges = await stripe.charges.list({ customer: customerId, limit: 20 })
    return charges.data
  })
}

function toChargeSnapshot(charge: Stripe.Charge): StripeChargeSnapshot {
  return {
    id: charge.id,
    amount: charge.amount,
    amountCaptured: charge.amount_captured,
    amountRefunded: charge.amount_refunded,
    currency: currency(charge.currency),
    created: unix(charge.created),
    description: charge.description,
    calculatedStatementDescriptor: charge.calculated_statement_descriptor,
    paymentIntent: objectId(charge.payment_intent),
    receiptUrl: charge.receipt_url,
    refunded: charge.refunded,
  }
}

function toCustomerSnapshot(customer: Stripe.Customer): StripeCustomerSnapshot {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name ?? null,
  }
}

function toCardSnapshot(charge: Stripe.Charge): StripeCardSnapshot | null {
  const card = charge.payment_method_details?.card
  if (!card) return null

  return {
    brand: card.brand,
    last4: card.last4,
    network: card.network,
    fingerprint: card.fingerprint ?? null,
    checks: card.checks
      ? {
          addressLine1Check: card.checks.address_line1_check,
          addressPostalCodeCheck: card.checks.address_postal_code_check,
          cvcCheck: card.checks.cvc_check,
        }
      : null,
    threeDSecure: card.three_d_secure
      ? {
          result: card.three_d_secure.result,
          resultReason: card.three_d_secure.result_reason,
          version: card.three_d_secure.version,
        }
      : null,
  }
}

function toRiskSnapshot(charge: Stripe.Charge, review: Stripe.Review | null): StripeRiskSnapshot {
  return {
    level: charge.outcome?.risk_level ?? null,
    score: charge.outcome?.risk_score ?? null,
    outcomeType: charge.outcome?.type ?? null,
    outcomeReason: charge.outcome?.reason ?? null,
    review: review
      ? {
          id: review.id,
          open: review.open,
          reason: review.reason,
          closedReason: review.closed_reason,
          ipAddress: review.ip_address,
          ipAddressLocation: review.ip_address_location,
        }
      : null,
  }
}

function toInvoiceSnapshot(invoice: Stripe.Invoice): StripeInvoiceSnapshot {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: currency(invoice.currency),
    subtotal: invoice.subtotal,
    total: invoice.total,
    amountPaid: invoice.amount_paid,
    amountDue: invoice.amount_due,
    amountRemaining: invoice.amount_remaining,
    invoicePdf: invoice.invoice_pdf ?? null,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    created: unix(invoice.created),
  }
}

function toSubscriptionSnapshot(subscription: Stripe.Subscription): StripeSubscriptionSnapshot {
  const items = subscription.items.data.map(toSubscriptionItemSnapshot)
  const firstItem = subscription.items.data[0]

  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: firstItem ? unix(firstItem.current_period_start) : null,
    currentPeriodEnd: firstItem ? unix(firstItem.current_period_end) : null,
    cancelAt: subscription.cancel_at ? unix(subscription.cancel_at) : null,
    canceledAt: subscription.canceled_at ? unix(subscription.canceled_at) : null,
    items,
  }
}

function toSubscriptionItemSnapshot(item: Stripe.SubscriptionItem): StripeSubscriptionItemSnapshot {
  const product = expandedProductObject(item.price.product)

  return {
    subscriptionItemId: item.id,
    priceId: item.price.id,
    productId: objectId(item.price.product) ?? 'unknown',
    productName: product?.name ?? null,
    priceNickname: item.price.nickname,
    amountMinor: item.price.unit_amount,
    currency: currency(item.price.currency),
    interval: item.price.recurring?.interval ?? null,
    quantity: item.quantity,
  }
}

function toRefundSnapshot(refund: Stripe.Refund): StripeRefundSnapshot {
  return {
    id: refund.id,
    amount: refund.amount,
    currency: currency(refund.currency),
    status: refund.status,
    reason: refund.reason,
    created: unix(refund.created),
  }
}

function toPaymentHistorySnapshot(
  charges: Stripe.Charge[],
  disputedChargeId: string,
): StripePaymentHistorySnapshot {
  const priorCharges = charges
    .filter((charge) => charge.id !== disputedChargeId)
    .map(toPriorChargeSnapshot)

  return {
    priorCharges,
    totalPaidByCurrency: totalPaidByCurrency(charges),
  }
}

function toPriorChargeSnapshot(charge: Stripe.Charge): StripePriorChargeSnapshot {
  const card = charge.payment_method_details?.card

  return {
    id: charge.id,
    amount: charge.amount,
    amountCaptured: charge.amount_captured,
    amountRefunded: charge.amount_refunded,
    currency: currency(charge.currency),
    created: unix(charge.created),
    paid: charge.paid,
    disputed: charge.disputed,
    refunded: charge.refunded,
    card: card
      ? {
          last4: card.last4,
          network: card.network,
          fingerprint: card.fingerprint ?? null,
        }
      : null,
    receiptUrl: charge.receipt_url,
  }
}

function totalPaidByCurrency(charges: Stripe.Charge[]) {
  const totals: Record<string, number> = {}

  for (const charge of charges) {
    if (!charge.paid) continue

    totals[charge.currency] = (totals[charge.currency] ?? 0) + charge.amount_captured
  }

  return totals
}

function expanded<T extends { id: string; object?: string }>(
  value: string | T | null | undefined,
  object: string,
): T | null {
  if (!value || typeof value === 'string') return null
  if (value.object && value.object !== object) return null

  return value
}

function objectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.id
}

function expandedCustomerObject(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Stripe.Customer | null {
  if (!value || typeof value === 'string') return null
  if (value.deleted) return null

  return value
}

function expandedProductObject(
  value: string | Stripe.Product | Stripe.DeletedProduct,
): Stripe.Product | null {
  if (typeof value === 'string') return null
  if (value.deleted) return null

  return value
}

function invoiceHasCharge(invoice: Stripe.Invoice, chargeId: string): boolean {
  return (
    invoice.payments?.data.some((payment) => objectId(payment.payment.charge) === chargeId) ?? false
  )
}

function getInvoiceSubscription(invoice: Stripe.Invoice): string | Stripe.Subscription | null {
  const parent = invoice.parent
  if (parent?.type === 'subscription_details' && parent.subscription_details) {
    return parent.subscription_details.subscription
  }

  return null
}

function currency(value: string) {
  return currencyCodeSchema.parse(value)
}

function unix(seconds: number): Date {
  return new Date(seconds * 1000)
}
