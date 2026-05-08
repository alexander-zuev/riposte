// TODO: implement idempotency — deduplicate by event.id before enqueuing commands
// TODO: verify correct 4xx vs 5xx responses per Stripe retry semantics

import { createCommand, createLogger, type DomainCommand } from '@riposte/core'
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

        if (!event.account) {
          logger.error('webhook_missing_account', { type: event.type, id: event.id })
          return new Response('Missing account', { status: 500 })
        }

        const connectionResult = await deps.repos
          .stripeConnections(deps.db())
          .findByStripeAccountId(event.account)

        if (connectionResult.isErr()) {
          logger.error('webhook_connection_lookup_failed', {
            error: connectionResult.error,
            account: event.account,
          })
          return new Response('Internal error', { status: 500 })
        }

        const connection = connectionResult.value
        if (!connection) {
          logger.error('webhook_unknown_account', {
            account: event.account,
            eventId: event.id,
            type: event.type,
          })
          return new Response('Unknown account', { status: 500 })
        }

        const stripeEvent = event as unknown as Record<string, unknown>
        const { userId } = connection
        let command: DomainCommand

        switch (event.type) {
          case 'charge.dispute.created':
            command = createCommand('IngestDisputeCreated', { userId, stripeEvent })
            break
          case 'charge.dispute.updated':
            command = createCommand('IngestDisputeUpdated', { userId, stripeEvent })
            break
          case 'charge.dispute.closed':
            command = createCommand('IngestDisputeClosed', { userId, stripeEvent })
            break
          case 'charge.dispute.funds_reinstated':
            command = createCommand('IngestDisputeFundsReinstated', { userId, stripeEvent })
            break
          case 'charge.dispute.funds_withdrawn':
            command = createCommand('IngestDisputeFundsWithdrawn', { userId, stripeEvent })
            break
          default:
            logger.warn('webhook_unhandled_event_type', { type: event.type, id: event.id })
            return new Response('OK', { status: 200 })
        }

        const sendResult = await deps.services.queueClient().send(command)

        if (sendResult.isErr()) {
          logger.error('webhook_queue_send_failed', {
            error: sendResult.error,
            eventId: event.id,
          })
          return new Response('Queue error', { status: 500 })
        }

        logger.info('webhook_dispatched', {
          command: command.name,
          eventId: event.id,
          account: event.account,
          userId,
        })

        return new Response('OK', { status: 200 })
      },
    },
  },
})
