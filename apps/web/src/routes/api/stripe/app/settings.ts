import { createQuery } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { stripeAppApiMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/stripe/app/settings')({
  server: {
    middleware: stripeAppApiMiddleware,
    handlers: {
      POST: async ({ context }) => {
        const query = createQuery('GetStripeAppSettings', {
          stripeAccountId: context.stripeApp.accountId,
          livemode: context.stripeApp.livemode,
        })
        const result = await context.deps.services.messageBus().handle(query)

        return resultToApiResponse(result)
      },
    },
  },
})
