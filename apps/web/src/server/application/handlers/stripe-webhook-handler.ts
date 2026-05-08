import {
  createCommand,
  createLogger,
  type DatabaseError,
  type HandleStripeWebhookReceived,
  type QueueError,
} from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { Result } from 'better-result'

const logger = createLogger('stripe-webhook-handler')

type StripeWebhookHandlerError = DatabaseError | QueueError

const DISPUTE_EVENT_COMMANDS = {
  'charge.dispute.created': 'IngestDisputeCreated',
  'charge.dispute.updated': 'IngestDisputeUpdated',
  'charge.dispute.closed': 'IngestDisputeClosed',
  'charge.dispute.funds_reinstated': 'IngestDisputeFundsReinstated',
  'charge.dispute.funds_withdrawn': 'IngestDisputeFundsWithdrawn',
} as const

type DisputeEventType = keyof typeof DISPUTE_EVENT_COMMANDS

export async function handleStripeWebhookReceived(
  command: HandleStripeWebhookReceived,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeWebhookHandlerError>> {
  const event = command.stripeEvent
  const type = getStringField(event, 'type')
  const eventId = getStringField(event, 'id')
  const account = getStringField(event, 'account')

  if (type === 'account.application.authorized') {
    logger.info('stripe_app_authorized_received', { account, eventId })
    return Result.ok(undefined)
  }

  if (type === 'account.application.deauthorized') {
    logger.info('stripe_app_deauthorized_received', { account, eventId })
    return Result.ok(undefined)
  }

  if (!isDisputeEventType(type)) {
    logger.warn('stripe_webhook_unhandled_event_type', { type, eventId })
    return Result.ok(undefined)
  }

  if (!account) {
    logger.error('stripe_webhook_missing_account', { type, eventId })
    return Result.ok(undefined)
  }

  const connectionResult = await deps.repos.stripeConnections(tx).findByStripeAccountId(account)
  if (connectionResult.isErr()) return Result.err(connectionResult.error)

  const connection = connectionResult.value
  if (!connection) {
    logger.warn('stripe_webhook_unknown_account', { account, eventId, type })
    return Result.ok(undefined)
  }

  const disputeCommand = createCommand(DISPUTE_EVENT_COMMANDS[type], {
    userId: connection.userId,
    stripeEvent: event,
  })
  const sendResult = await deps.services.queueClient().send(disputeCommand)
  if (sendResult.isErr()) return Result.err(sendResult.error)

  logger.info('stripe_webhook_dispatched', {
    command: disputeCommand.name,
    eventId,
    account,
    userId: connection.userId,
  })

  return Result.ok(undefined)
}

function isDisputeEventType(type: string | undefined): type is DisputeEventType {
  if (!type) return false
  return type in DISPUTE_EVENT_COMMANDS
}

function getStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}
