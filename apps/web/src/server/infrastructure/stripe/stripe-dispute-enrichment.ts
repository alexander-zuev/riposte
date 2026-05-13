import { createLogger, currencyCodeSchema, type StripeApiError } from '@riposte/core'
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

const logger = createLogger('stripe-dispute-enrichment')

export type FetchStripeDisputeContextResult = {
  context: SaveStripeDisputeContextInput
  stripeDispute: Stripe.Dispute
}

export async function fetchStripeDisputeContext(
  stripe: Stripe,
  disputeCase: DisputeCase,
): Promise<Result<FetchStripeDisputeContextResult, StripeApiError>> {
  return await Result.gen(async function* () {
    const dispute = yield* Result.await(
      stripeRequest('disputes.retrieve', () =>
        stripe.disputes.retrieve(disputeCase.id, {
          expand: ['charge', 'charge.customer', 'charge.payment_intent', 'payment_intent'],
        }),
      ),
    )
    logStripeResponse('disputes.retrieve', disputeCase.id, dispute)

    const chargeId = objectId(dispute.charge) ?? disputeCase.charge
    const charge = yield* Result.await(
      stripeRequest('charges.retrieve', () =>
        stripe.charges.retrieve(chargeId, { expand: ['customer', 'payment_intent'] }),
      ),
    )
    logStripeResponse('charges.retrieve', chargeId, charge)

    const customer = yield* Result.await(resolveCustomer(stripe, charge))
    const invoice = yield* Result.await(resolveInvoice(stripe, customer?.id ?? null, charge))
    const subscription = yield* Result.await(resolveSubscription(stripe, invoice))
    const refunds = yield* Result.await(resolveRefunds(stripe, charge))
    const review = yield* Result.await(resolveReview(stripe, charge))
    const priorCharges = yield* Result.await(resolvePriorCharges(stripe, customer?.id ?? null))
    const paymentMethods = yield* Result.await(resolvePaymentMethods(stripe, [charge, ...priorCharges]))

    return Result.ok({
      context: {
        disputeCaseId: disputeCase.id,
        charge: toChargeSnapshot(charge),
        customer: customer ? toCustomerSnapshot(customer) : null,
        card: toCardSnapshot(charge, paymentMethods.get(objectId(charge.payment_method) ?? '')),
        risk: toRiskSnapshot(charge, review),
        invoice: invoice ? toInvoiceSnapshot(invoice) : null,
        subscription: subscription ? toSubscriptionSnapshot(subscription) : null,
        refunds: refunds.map(toRefundSnapshot),
        paymentHistory: toPaymentHistorySnapshot(priorCharges, charge.id, paymentMethods),
      },
      stripeDispute: dispute,
    })
  })
}

function resolveCustomer(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Customer | null, StripeApiError>> {
  const customer = charge.customer
  const expandedCustomer = expandedCustomerObject(customer)
  if (expandedCustomer) {
    logStripeResponse('customers.resolve_expanded', expandedCustomer.id, expandedCustomer)
    return Promise.resolve(Result.ok(expandedCustomer))
  }

  const customerId = objectId(customer)
  if (!customerId) return Promise.resolve(Result.ok(null))

  return stripeRequest('customers.retrieve', async () => {
    const found = await stripe.customers.retrieve(customerId)
    const resolvedCustomer = found.deleted ? null : found
    logStripeResponse('customers.retrieve', customerId, resolvedCustomer)
    return resolvedCustomer
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
  logStripeResponse('invoices.list', customerId, invoices.value)

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
  if (typeof invoiceSubscription !== 'string') {
    logStripeResponse('subscriptions.resolve_expanded', invoiceSubscription.id, invoiceSubscription)
    return Promise.resolve(Result.ok(invoiceSubscription))
  }

  return stripeRequest('subscriptions.retrieve', async () => {
    const subscription = await stripe.subscriptions.retrieve(invoiceSubscription, {
      expand: ['items.data.price.product'],
    })
    logStripeResponse('subscriptions.retrieve', invoiceSubscription, subscription)
    return subscription
  })
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
  logStripeResponse('refunds.list', charge.id, refunds.value)

  return Result.ok(refunds.value.data)
}

function resolveReview(
  stripe: Stripe,
  charge: Stripe.Charge,
): Promise<Result<Stripe.Review | null, StripeApiError>> {
  const review = charge.review
  const expandedReview = expanded<Stripe.Review>(review, 'review')
  if (expandedReview) {
    logStripeResponse('reviews.resolve_expanded', expandedReview.id, expandedReview)
    return Promise.resolve(Result.ok(expandedReview))
  }

  const reviewId = objectId(review)
  if (!reviewId) return Promise.resolve(Result.ok(null))

  return stripeRequest('reviews.retrieve', async () => {
    const found = await stripe.reviews.retrieve(reviewId)
    logStripeResponse('reviews.retrieve', reviewId, found)
    return found
  })
}

function resolvePriorCharges(
  stripe: Stripe,
  customerId: string | null,
): Promise<Result<Stripe.Charge[], StripeApiError>> {
  if (!customerId) return Promise.resolve(Result.ok([]))

  return stripeRequest('charges.list', async () => {
    const charges = await stripe.charges.list({ customer: customerId, limit: 20 })
    logStripeResponse('charges.list', customerId, charges)
    return charges.data
  })
}

async function resolvePaymentMethods(
  stripe: Stripe,
  charges: Stripe.Charge[],
): Promise<Result<Map<string, Stripe.PaymentMethod>, StripeApiError>> {
  const paymentMethodIds = new Set<string>()
  for (const charge of charges) {
    const paymentMethodId = objectId(charge.payment_method)
    if (paymentMethodId) paymentMethodIds.add(paymentMethodId)
  }

  const paymentMethods = new Map<string, Stripe.PaymentMethod>()
  for (const paymentMethodId of paymentMethodIds) {
    const paymentMethod = await stripeRequest('paymentMethods.retrieve', async () => {
      const found = await stripe.paymentMethods.retrieve(paymentMethodId)
      logStripeResponse('paymentMethods.retrieve', paymentMethodId, found)
      return found
    })
    if (paymentMethod.isErr()) return Result.err(paymentMethod.error)

    paymentMethods.set(paymentMethodId, paymentMethod.value)
  }

  return Result.ok(paymentMethods)
}

function logStripeResponse(operation: string, id: string, response: unknown) {
  logger.debug('stripe_enrichment_response', {
    operation,
    id,
    response: summarizeStripeResponse(response),
  })
}

function summarizeStripeResponse(response: unknown) {
  if (!response || typeof response !== 'object') return { object: typeof response }

  const object = response as { object?: string }
  switch (object.object) {
    case 'dispute':
      return summarizeDispute(response as Stripe.Dispute)
    case 'charge':
      return summarizeCharge(response as Stripe.Charge)
    case 'customer':
      return summarizeCustomer(response as Stripe.Customer)
    case 'invoice':
      return summarizeInvoice(response as Stripe.Invoice)
    case 'subscription':
      return summarizeSubscription(response as Stripe.Subscription)
    case 'refund':
      return summarizeRefund(response as Stripe.Refund)
    case 'review':
      return summarizeReview(response as Stripe.Review)
    case 'payment_method':
      return summarizePaymentMethod(response as Stripe.PaymentMethod)
    case 'list':
      return summarizeList(response as Stripe.ApiList<unknown>)
    default:
      return { object: object.object ?? 'unknown', id: summaryObjectId(response) }
  }
}

function summarizeDispute(dispute: Stripe.Dispute) {
  const evidence = dispute.evidence ?? {}
  const evidenceDetails = dispute.evidence_details
  const card = dispute.payment_method_details?.card

  return {
    object: dispute.object,
    id: dispute.id,
    amount: dispute.amount,
    currency: dispute.currency,
    status: dispute.status,
    reason: dispute.reason,
    chargeId: objectId(dispute.charge),
    paymentIntentId: objectId(dispute.payment_intent),
    balanceTransactionId: summaryObjectId(
      (dispute as { balance_transaction?: unknown }).balance_transaction,
    ),
    balanceTransactionCount: dispute.balance_transactions?.length ?? 0,
    evidence: {
      hasCustomerPurchaseIp: Boolean(evidence.customer_purchase_ip),
      hasCustomerEmailAddress: Boolean(evidence.customer_email_address),
      hasCustomerName: Boolean(evidence.customer_name),
      hasBillingAddress: Boolean(evidence.billing_address),
      hasProductDescription: Boolean(evidence.product_description),
    },
    evidenceDetails: evidenceDetails
      ? {
          dueBy: evidenceDetails.due_by,
          hasEvidence: evidenceDetails.has_evidence,
          pastDue: evidenceDetails.past_due,
          submissionCount: evidenceDetails.submission_count,
        }
      : null,
    card: card
      ? {
          brand: card.brand,
          caseType: card.case_type,
          networkReasonCode: card.network_reason_code,
        }
      : null,
  }
}

function summarizeCharge(charge: Stripe.Charge) {
  const card = charge.payment_method_details?.card

  return {
    object: charge.object,
    id: charge.id,
    amount: charge.amount,
    amountCaptured: charge.amount_captured,
    amountRefunded: charge.amount_refunded,
    currency: charge.currency,
    customerId: objectId(charge.customer),
    paymentIntentId: objectId(charge.payment_intent),
    paymentMethodId: objectId(charge.payment_method),
    disputed: charge.disputed,
    refunded: charge.refunded,
    riskLevel: charge.outcome?.risk_level ?? null,
    riskScore: charge.outcome?.risk_score ?? null,
    card: card
      ? {
          brand: card.brand,
          last4: card.last4,
          network: card.network,
          country: card.country,
          funding: card.funding,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          hasFingerprint: Boolean(card.fingerprint),
          hasThreeDSecure: Boolean(card.three_d_secure),
          networkTransactionId: card.network_transaction_id ?? null,
          checks: card.checks,
        }
      : null,
  }
}

function summarizeCustomer(customer: Stripe.Customer) {
  return {
    object: customer.object,
    id: customer.id,
    hasEmail: Boolean(customer.email),
    hasName: Boolean(customer.name),
    hasAddress: Boolean(customer.address),
  }
}

function summarizeInvoice(invoice: Stripe.Invoice) {
  return {
    object: invoice.object,
    id: invoice.id,
    status: invoice.status,
    total: invoice.total,
    currency: invoice.currency,
    hasInvoicePdf: Boolean(invoice.invoice_pdf),
    hasHostedInvoiceUrl: Boolean(invoice.hosted_invoice_url),
  }
}

function summarizeSubscription(subscription: Stripe.Subscription) {
  return {
    object: subscription.object,
    id: subscription.id,
    status: subscription.status,
    itemCount: subscription.items.data.length,
  }
}

function summarizeRefund(refund: Stripe.Refund) {
  return {
    object: refund.object,
    id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
  }
}

function summarizeReview(review: Stripe.Review) {
  return {
    object: review.object,
    id: review.id,
    open: review.open,
    reason: review.reason,
    closedReason: review.closed_reason,
    hasIpAddress: Boolean(review.ip_address),
  }
}

function summarizePaymentMethod(paymentMethod: Stripe.PaymentMethod) {
  const card = paymentMethod.card

  return {
    object: paymentMethod.object,
    id: paymentMethod.id,
    type: paymentMethod.type,
    card: card
      ? {
          brand: card.brand,
          last4: card.last4,
          country: card.country,
          funding: card.funding,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          hasFingerprint: Boolean(card.fingerprint),
        }
      : null,
  }
}

function summarizeList(list: Stripe.ApiList<unknown>) {
  const objectTypes = new Set<string>()
  for (const item of list.data) {
    if (item && typeof item === 'object' && 'object' in item && typeof item.object === 'string') {
      objectTypes.add(item.object)
    }
  }

  return {
    object: list.object,
    count: list.data.length,
    hasMore: list.has_more,
    objectTypes: [...objectTypes],
  }
}

function summaryObjectId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (!value || typeof value !== 'object') return null
  if (!('id' in value)) return null

  return typeof value.id === 'string' && value.id.trim() ? value.id : null
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

function toCardSnapshot(
  charge: Stripe.Charge,
  paymentMethod: Stripe.PaymentMethod | undefined,
): StripeCardSnapshot | null {
  const card = charge.payment_method_details?.card
  const paymentMethodCard = paymentMethod?.card
  if (!card) return null

  return {
    paymentMethodId: objectId(charge.payment_method),
    brand: card.brand,
    last4: card.last4,
    network: card.network,
    fingerprint: card?.fingerprint ?? paymentMethodCard?.fingerprint ?? null,
    country: card.country ?? null,
    funding: card.funding ?? null,
    expMonth: card.exp_month ?? null,
    expYear: card.exp_year ?? null,
    networkTransactionId: card.network_transaction_id ?? null,
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
  paymentMethods: Map<string, Stripe.PaymentMethod>,
): StripePaymentHistorySnapshot {
  const priorCharges = charges
    .filter((charge) => charge.id !== disputedChargeId)
    .map((charge) => toPriorChargeSnapshot(charge, paymentMethods))

  return {
    priorCharges,
    totalPaidByCurrency: totalPaidByCurrency(charges),
  }
}

function toPriorChargeSnapshot(
  charge: Stripe.Charge,
  paymentMethods: Map<string, Stripe.PaymentMethod>,
): StripePriorChargeSnapshot {
  const card = charge.payment_method_details?.card
  const paymentMethod = paymentMethods.get(objectId(charge.payment_method) ?? '')

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
          fingerprint: card.fingerprint ?? paymentMethod?.card?.fingerprint ?? null,
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
