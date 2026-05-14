import { createCommand } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { stripeAppApiMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/stripe/app/sync')({
  server: {
    middleware: stripeAppApiMiddleware,
    handlers: {
      POST: async ({ context }) => {
        const command = createCommand('SyncDisputes', {
          stripeAccountId: context.stripeApp.accountId,
          livemode: context.stripeApp.livemode,
          timeline: 'last_120_days',
        })
        const result = await context.deps.services.queueClient().send(command)

        return resultToApiResponse(result, {
          ok: () => Response.json({ status: 'queued' }, { status: 202 }),
        })
      },
    },
  },
})
