import { createQuery } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const settingsSearchSchema = z.object({
  account_id: z.string().min(1),
  livemode: z.enum(['true', 'false']).transform((value) => value === 'true'),
})

export const Route = createFileRoute('/api/stripe/app/settings')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      GET: async ({ request, context }) => {
        const url = new URL(request.url)
        const parsed = settingsSearchSchema.safeParse({
          account_id: url.searchParams.get('account_id'),
          livemode: url.searchParams.get('livemode'),
        })

        if (!parsed.success) {
          return Response.json({ error: 'Invalid Stripe App settings request' }, { status: 400 })
        }

        const query = createQuery('GetStripeAppSettings', {
          stripeAccountId: parsed.data.account_id,
          livemode: parsed.data.livemode,
        })
        const result = await context.deps.services.messageBus().handle(query)

        return resultToApiResponse(result)
      },
    },
  },
})
