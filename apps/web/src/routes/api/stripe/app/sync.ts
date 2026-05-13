import { createCommand } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const syncBodySchema = z.object({
  accountId: z.string().min(1),
  livemode: z.boolean(),
})

export const Route = createFileRoute('/api/stripe/app/sync')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      POST: async ({ request, context }) => {
        const parsed = syncBodySchema.safeParse(await request.json())

        if (!parsed.success) {
          return Response.json({ error: 'Invalid Stripe App sync request' }, { status: 400 })
        }

        const command = createCommand('SyncDisputes', {
          stripeAccountId: parsed.data.accountId,
          livemode: parsed.data.livemode,
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
