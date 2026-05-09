import {
  createCommand,
  type DomainCommand,
  type MessageId,
  type StripeWebhookEvent,
} from '@riposte/core'

export function toStripeWebhookCommand(event: StripeWebhookEvent): DomainCommand | undefined {
  const commandId = stripeWebhookMessageId(event)

  switch (event.type) {
    case 'account.application.authorized':
      return createCommand('HandleStripeAppAuthorized', { stripeEvent: event }, commandId)
    case 'account.application.deauthorized':
      return createCommand('HandleStripeAppDeauthorized', { stripeEvent: event }, commandId)
    case 'charge.dispute.created':
      return createCommand('IngestDisputeCreated', { stripeEvent: event }, commandId)
    case 'charge.dispute.updated':
      return createCommand('IngestDisputeUpdated', { stripeEvent: event }, commandId)
    case 'charge.dispute.closed':
      return createCommand('IngestDisputeClosed', { stripeEvent: event }, commandId)
    case 'charge.dispute.funds_reinstated':
      return createCommand('IngestDisputeFundsReinstated', { stripeEvent: event }, commandId)
    case 'charge.dispute.funds_withdrawn':
      return createCommand('IngestDisputeFundsWithdrawn', { stripeEvent: event }, commandId)
    default:
      return undefined
  }
}

export function stripeWebhookMessageId(event: StripeWebhookEvent): MessageId {
  return `stripe:event:${event.id}`
}
