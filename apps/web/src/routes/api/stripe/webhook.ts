// TODO: implement idempotency — deduplicate by event.id before handling commands
// TODO: verify correct 4xx vs 5xx responses per Stripe retry semantics

import {
  createCommand,
  createLogger,
  type DomainCommand,
  type StripeWebhookEvent,
} from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { withDepsRequest } from '@server/infrastructure/middleware/deps.middleware'
import { createFileRoute } from '@tanstack/react-router'
import Stripe from 'stripe'

const logger = createLogger('stripe-webhook')

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    middleware: [withDepsRequest],
    handlers: {
      POST: async ({ request, context }) => {
        const config = getServerConfig()
        const { deps } = context
        const signature = request.headers.get('stripe-signature') ?? ''
        const rawBody = await request.text()
        let event: Stripe.Event

        try {
          event = await Stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            config.stripe.appWebhookSecret,
          )
        } catch (err) {
          logger.error('webhook_signature_invalid', { error: err })
          return new Response('Invalid signature', { status: 400 })
        }

        const stripeEvent = toStripeWebhookEvent(event)
        const command = toStripeWebhookCommand(stripeEvent)
        if (!command) {
          logger.warn('webhook_unhandled_event_type', { type: event.type, id: event.id })
          return new Response('OK', { status: 200 })
        }

        const result = await deps.services.queueClient().send(command)

        if (result.isErr()) {
          logger.error('webhook_queue_send_failed', {
            error: result.error,
            eventId: event.id,
            type: event.type,
          })
          return new Response('Queue error', { status: 500 })
        }

        return new Response('OK', { status: 200 })
      },
    },
  },
})

function toStripeWebhookEvent(event: Stripe.Event): StripeWebhookEvent {
  return {
    ...event,
    id: event.id,
    type: event.type,
    account: event.account,
    livemode: event.livemode,
    data: event.data,
  }
}

function toStripeWebhookCommand(event: StripeWebhookEvent): DomainCommand | undefined {
  switch (event.type) {
    case 'account.application.authorized':
      return createCommand('HandleStripeAppAuthorized', { stripeEvent: event })
    case 'account.application.deauthorized':
      return createCommand('HandleStripeAppDeauthorized', { stripeEvent: event })
    case 'charge.dispute.created':
      return createCommand('IngestDisputeCreated', { stripeEvent: event })
    case 'charge.dispute.updated':
      return createCommand('IngestDisputeUpdated', { stripeEvent: event })
    case 'charge.dispute.closed':
      return createCommand('IngestDisputeClosed', { stripeEvent: event })
    case 'charge.dispute.funds_reinstated':
      return createCommand('IngestDisputeFundsReinstated', { stripeEvent: event })
    case 'charge.dispute.funds_withdrawn':
      return createCommand('IngestDisputeFundsWithdrawn', { stripeEvent: event })
    default:
      return undefined
  }
}
