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
} from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { DisputeCase } from '@server/domain/disputes'
import { evaluateStripeWebhookConnection } from '@server/domain/stripe'
import { Result } from 'better-result'

const logger = createLogger('stripe-webhook-handler')

type StripeWebhookHandlerError = DatabaseError

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
  // Stripe Connect events must map back to an active merchant connection before we act.
  const { account, id: eventId } = command.stripeEvent

  const connectionResult = account
    ? await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
    : Result.ok(null)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const decision = evaluateStripeWebhookConnection({ account, connection: connectionResult.value })
  if (decision.action === 'ignore') {
    if (decision.reason === 'revoked_connection') {
      logger.warn('stripe_dispute_created_revoked_connection', { account, eventId })
      return Result.ok(undefined)
    }

    logger.error(`stripe_dispute_created_${decision.reason}`, { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_created_received', {
    account,
    eventId,
    userId: decision.connection.userId,
  })

  const disputeCase = DisputeCase.receiveStripeDispute({
    userId: decision.connection.userId,
    stripeAccountId: decision.connection.stripeAccountId,
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

export async function handleDisputeUpdated(
  command: IngestDisputeUpdated,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  // Updates can arrive after uninstall; ignore them unless the connection is active.
  const { account, id: eventId } = command.stripeEvent

  const connectionResult = account
    ? await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
    : Result.ok(null)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const decision = evaluateStripeWebhookConnection({ account, connection: connectionResult.value })
  if (decision.action === 'ignore') {
    if (decision.reason === 'revoked_connection') {
      logger.warn('stripe_dispute_updated_revoked_connection', { account, eventId })
      return Result.ok(undefined)
    }

    logger.error(`stripe_dispute_updated_${decision.reason}`, { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_updated_received', {
    account,
    eventId,
    userId: decision.connection.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeClosed(
  command: IngestDisputeClosed,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  // Outcome events are only actionable for Stripe accounts we still own access to.
  const { account, id: eventId } = command.stripeEvent

  const connectionResult = account
    ? await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
    : Result.ok(null)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const decision = evaluateStripeWebhookConnection({ account, connection: connectionResult.value })
  if (decision.action === 'ignore') {
    if (decision.reason === 'revoked_connection') {
      logger.warn('stripe_dispute_closed_revoked_connection', { account, eventId })
      return Result.ok(undefined)
    }

    logger.error(`stripe_dispute_closed_${decision.reason}`, { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_closed_received', {
    account,
    eventId,
    userId: decision.connection.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeFundsReinstated(
  command: IngestDisputeFundsReinstated,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  // Funds events update money outcome later; for now they share the same access gate.
  const { account, id: eventId } = command.stripeEvent

  const connectionResult = account
    ? await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
    : Result.ok(null)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const decision = evaluateStripeWebhookConnection({ account, connection: connectionResult.value })
  if (decision.action === 'ignore') {
    if (decision.reason === 'revoked_connection') {
      logger.warn('stripe_dispute_funds_reinstated_revoked_connection', { account, eventId })
      return Result.ok(undefined)
    }

    logger.error(`stripe_dispute_funds_reinstated_${decision.reason}`, { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_funds_reinstated_received', {
    account,
    eventId,
    userId: decision.connection.userId,
  })

  return Result.ok(undefined)
}

export async function handleDisputeFundsWithdrawn(
  command: IngestDisputeFundsWithdrawn,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  // Funds events update money outcome later; for now they share the same access gate.
  const { account, id: eventId } = command.stripeEvent

  const connectionResult = account
    ? await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
    : Result.ok(null)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const decision = evaluateStripeWebhookConnection({ account, connection: connectionResult.value })
  if (decision.action === 'ignore') {
    if (decision.reason === 'revoked_connection') {
      logger.warn('stripe_dispute_funds_withdrawn_revoked_connection', { account, eventId })
      return Result.ok(undefined)
    }

    logger.error(`stripe_dispute_funds_withdrawn_${decision.reason}`, { account, eventId })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_funds_withdrawn_received', {
    account,
    eventId,
    userId: decision.connection.userId,
  })

  return Result.ok(undefined)
}
