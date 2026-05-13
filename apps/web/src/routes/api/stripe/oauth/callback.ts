import { createCommand, createLogger, StripeOAuthCallbackError } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'

const logger = createLogger('stripe-oauth')

export const Route = createFileRoute('/api/stripe/oauth/callback')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      GET: async ({ request, context }) => {
        const config = getServerConfig()
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
          return redirectToSettings(config, { stripeError })
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToSettings(config, { stripeError: 'missing_params' })
        }

        const command = createCommand('HandleStripeOAuthCallback', {
          code,
          state: state ?? undefined,
        })
        const result = await deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: () => redirectToSettings(config, { stripeConnected: 'true' }),
          err: (failure) => {
            if (StripeOAuthCallbackError.is(failure)) {
              return redirectToSettings(config, { stripeError: failure.reason })
            }

            logger.error('stripe_oauth_callback_command_failed', { error: failure })
            return redirectToSettings(config, { stripeError: 'persistence_failed' })
          },
        })
      },
    },
  },
})

function redirectToSettings(
  config: ReturnType<typeof getServerConfig>,
  search: Record<string, string>,
) {
  const url = new URL('/settings', config.appUrl)
  url.search = new URLSearchParams(search).toString()
  return Response.redirect(url.toString(), 302)
}
