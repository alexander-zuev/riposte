import { createCommand, createLogger, StripeOAuthCallbackError } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute, redirect } from '@tanstack/react-router'

const logger = createLogger('stripe-oauth')

export const Route = createFileRoute('/api/stripe/oauth/callback')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      GET: async ({ request, context }) => {
        const { deps } = context
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const stripeError = url.searchParams.get('error')

        if (stripeError) {
          logger.warn('stripe_oauth_error', {
            error: stripeError,
            description: url.searchParams.get('error_description'),
          })
          return redirectToNotifications({ stripeError })
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToNotifications({ stripeError: 'missing_params' })
        }

        const command = createCommand('HandleStripeOAuthCallback', {
          code,
          state: state ?? undefined,
        })
        const result = await deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: () => redirectToNotifications({ stripeConnected: 'true' }),
          err: (failure) => {
            if (StripeOAuthCallbackError.is(failure)) {
              return redirectToNotifications({ stripeError: failure.reason })
            }

            logger.error('stripe_oauth_callback_command_failed', { error: failure })
            return redirectToNotifications({ stripeError: 'persistence_failed' })
          },
        })
      },
    },
  },
})

function redirectToNotifications(search: Record<string, string>) {
  return redirect({
    to: '/notifications',
    search,
    statusCode: 302,
  })
}
