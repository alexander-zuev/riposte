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
import { Result } from 'better-result'

const logger = createLogger('stripe-webhook-handler')

type StripeWebhookHandlerError = DatabaseError
type DisputeCommand =
  | IngestDisputeCreated
  | IngestDisputeUpdated
  | IngestDisputeClosed
  | IngestDisputeFundsReinstated
  | IngestDisputeFundsWithdrawn

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

export async function ingestDisputeWebhook(
  command: DisputeCommand,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const { account, id: eventId, type } = command.stripeEvent

  if (!account) {
    logger.error('stripe_dispute_webhook_missing_account', { type, eventId })
    return Result.ok(undefined)
  }

  const connectionResult = await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const connection = connectionResult.value
  if (!connection) {
    logger.warn('stripe_dispute_webhook_unknown_account', { account, eventId, type })
    return Result.ok(undefined)
  }

  logger.info('stripe_dispute_webhook_received', {
    command: command.name,
    eventId,
    account,
    userId: connection.userId,
  })

  return Result.ok(undefined)
}
