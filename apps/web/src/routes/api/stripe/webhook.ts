import { createLogger, stripeWebhookEventSchema } from '@riposte/core'
import { toStripeWebhookCommand } from '@server/domain/stripe'
import { getServerConfig } from '@server/infrastructure/config'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import StripeClient, { type Stripe } from 'stripe'

const logger = createLogger('stripe-webhook')

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      POST: async ({ request, context }) => {
        const config = getServerConfig()
        const { deps } = context
        const queueClient = deps.services.queueClient()
        const signature = request.headers.get('stripe-signature') ?? ''
        const rawBody = await request.text()
        let event: Stripe.Event

        try {
          event = await StripeClient.webhooks.constructEventAsync(
            rawBody,
            signature,
            config.stripe.appWebhookSecret,
          )
        } catch (err) {
          logger.error('webhook_signature_invalid', { error: err })
          return new Response('Invalid signature', { status: 400 })
        }

        const parsedEvent = stripeWebhookEventSchema.safeParse(event)
        if (!parsedEvent.success) {
          logger.error('webhook_event_invalid', {
            error: parsedEvent.error,
            eventId: event.id,
            type: event.type,
          })
          return new Response('Invalid event', { status: 400 })
        }

        const stripeEvent = parsedEvent.data
        const command = toStripeWebhookCommand(stripeEvent)
        if (!command) {
          logger.warn('webhook_unhandled_event_type', { type: event.type, id: event.id })
          return new Response('OK', { status: 200 })
        }

        const result = await queueClient.send(command)

        return resultToApiResponse(result, {
          ok: () => new Response('OK', { status: 200 }),
          err: (error) => {
            logger.error('webhook_queue_send_failed', {
              error,
              eventId: event.id,
              type: event.type,
            })
            return new Response('Webhook processing failed', { status: 500 })
          },
        })
      },
    },
  },
})
