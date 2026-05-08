// TODO: implement idempotency — deduplicate by event.id before handling commands
// TODO: verify correct 4xx vs 5xx responses per Stripe retry semantics

import { createCommand, createLogger } from '@riposte/core'
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

        const result = await deps.services.messageBus().handle(
          createCommand('HandleStripeWebhookReceived', {
            stripeEvent: event as unknown as Record<string, unknown>,
          }),
        )

        if (result.isErr()) {
          logger.error('webhook_handler_failed', {
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
