import {
  createLogger,
  type DatabaseError,
  type HandleStripeAppAuthorized,
  type HandleStripeAppDeauthorized,
  type IngestDisputeClosed,
  type IngestDisputeCreated,
  type IngestDisputeFundsReinstated,
  type IngestDisputeFundsWithdrawn,
  type IngestDisputeUpdated,
  type StripeConnectionUnavailableError,
} from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { DisputeCase } from '@server/domain/disputes'
import { Result } from 'better-result'

const logger = createLogger('stripe-webhook-handler')

type StripeWebhookHandlerError = DatabaseError | StripeConnectionUnavailableError

export async function handleStripeAppAuthorized(
  command: HandleStripeAppAuthorized,
): Promise<Result<void, StripeWebhookHandlerError>> {
  logger.info('stripe_app_authorized_received', {
    account: command.stripeEvent.account,
    eventId: command.stripeEvent.id,
    livemode: command.stripeEvent.livemode,
    stripeEvent: command.stripeEvent,
    type: command.stripeEvent.type,
  })

  return Result.ok(undefined)
}

export async function handleStripeAppDeauthorized(
  command: HandleStripeAppDeauthorized,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  logger.info('stripe_app_deauthorized_received', {
    account,
    eventId,
    livemode: command.stripeEvent.livemode,
    stripeEvent: command.stripeEvent,
    type: command.stripeEvent.type,
  })

  if (!account) {
    logger.error('stripe_app_deauthorized_missing_account', { eventId })
    return Result.ok(undefined)
  }

  const revoked = await deps.repos.stripeConnections(tx).markRevokedByStripeAccountId({
    stripeAccountId: account,
    stripeEventId: eventId,
    revokedAt: new Date(),
  })
  if (revoked.isErr()) return Result.err(revoked.error)

  if (!revoked.value) {
    logger.warn('stripe_app_deauthorized_unknown_account', { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_connection_revoked', {
    account,
    eventId,
    stripeConnectionId: revoked.value.id,
    userId: revoked.value.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeCreated(
  command: IngestDisputeCreated,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  const connection = await deps.services.stripeClientProvider().resolveConnection(account)
  if (connection.isErr()) return Result.err(connection.error)

  logger.info('stripe_dispute_created_received', {
    account,
    eventId,
    userId: connection.value.userId,
  })
  logger.debug('stripe_dispute_created_object', {
    account,
    eventId,
    stripeDispute: summarizeStripeDispute(command.stripeEvent.data.object),
  })

  const disputeCase = DisputeCase.receiveStripeDispute({
    userId: connection.value.userId,
    stripeAccountId: connection.value.stripeAccountId,
    sourceStripeEventId: command.stripeEvent.id,
    sourceStripeEventType: command.stripeEvent.type,
    stripeDispute: command.stripeEvent.data.object,
  })
  if (disputeCase.isErr()) {
    logger.error('stripe_dispute_created_unactionable', {
      account,
      eventId,
      error: disputeCase.error,
    })
    return Result.ok(undefined)
  }

  const saved = await deps.repos.disputeCases(tx).save(disputeCase.value)
  if (saved.isErr()) return Result.err(saved.error)

  logger.info('stripe_dispute_case_saved', {
    account,
    disputeCaseId: saved.value.id,
    eventId,
    userId: saved.value.userId,
  })

  return Result.ok(undefined)
}

function summarizeStripeDispute(input: unknown) {
  if (!input || typeof input !== 'object') return { object: typeof input }

  const dispute = input as Record<string, unknown>
  const evidence = objectRecord(dispute.evidence)
  const evidenceDetails = objectRecord(dispute.evidence_details)
  const paymentMethodDetails = objectRecord(dispute.payment_method_details)
  const card = objectRecord(paymentMethodDetails?.card)

  return {
    id: stringValue(dispute.id),
    object: stringValue(dispute.object),
    amount: numberValue(dispute.amount),
    currency: stringValue(dispute.currency),
    status: stringValue(dispute.status),
    reason: stringValue(dispute.reason),
    chargeId: expandableId(dispute.charge),
    paymentIntentId: expandableId(dispute.payment_intent),
    balanceTransactionId: expandableId(dispute.balance_transaction),
    balanceTransactionCount: Array.isArray(dispute.balance_transactions)
      ? dispute.balance_transactions.length
      : 0,
    evidence: {
      hasCustomerPurchaseIp: Boolean(stringValue(evidence?.customer_purchase_ip)),
      hasCustomerEmailAddress: Boolean(stringValue(evidence?.customer_email_address)),
      hasCustomerName: Boolean(stringValue(evidence?.customer_name)),
      hasBillingAddress: Boolean(stringValue(evidence?.billing_address)),
      hasProductDescription: Boolean(stringValue(evidence?.product_description)),
    },
    evidenceDetails: {
      dueBy: numberValue(evidenceDetails?.due_by),
      hasEvidence: booleanValue(evidenceDetails?.has_evidence),
      pastDue: booleanValue(evidenceDetails?.past_due),
      submissionCount: numberValue(evidenceDetails?.submission_count),
    },
    paymentMethodDetails: {
      type: stringValue(paymentMethodDetails?.type),
      cardBrand: stringValue(card?.brand),
      cardCaseType: stringValue(card?.case_type),
      cardNetworkReasonCode: stringValue(card?.network_reason_code),
    },
  }
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function expandableId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  const object = objectRecord(value)

  return stringValue(object?.id)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export async function handleDisputeUpdated(
  command: IngestDisputeUpdated,
  { deps }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  const connection = await deps.services.stripeClientProvider().resolveConnection(account)
  if (connection.isErr()) return Result.err(connection.error)

  logger.info('stripe_dispute_updated_received', {
    account,
    eventId,
    userId: connection.value.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeClosed(
  command: IngestDisputeClosed,
  { deps }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  const connection = await deps.services.stripeClientProvider().resolveConnection(account)
  if (connection.isErr()) return Result.err(connection.error)

  logger.info('stripe_dispute_closed_received', {
    account,
    eventId,
    userId: connection.value.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeFundsReinstated(
  command: IngestDisputeFundsReinstated,
  { deps }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  const connection = await deps.services.stripeClientProvider().resolveConnection(account)
  if (connection.isErr()) return Result.err(connection.error)

  logger.info('stripe_dispute_funds_reinstated_received', {
    account,
    eventId,
    userId: connection.value.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeFundsWithdrawn(
  command: IngestDisputeFundsWithdrawn,
  { deps }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId } = command.stripeEvent

  const connection = await deps.services.stripeClientProvider().resolveConnection(account)
  if (connection.isErr()) return Result.err(connection.error)

  logger.info('stripe_dispute_funds_withdrawn_received', {
    account,
    eventId,
    userId: connection.value.userId,
  })

  return Result.ok(undefined)
}
