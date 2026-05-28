import { createCommand, createLogger, StripeOAuthCallbackError } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'

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
          return redirectToPath(url, '/notifications', { stripeError })
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToPath(url, '/notifications', { stripeError: 'missing_params' })
        }

        const command = createCommand('HandleStripeOAuthCallback', {
          code,
          state: state ?? undefined,
        })
        const result = await deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: (value) => {
            if (value.redirectAfter?.endsWith('/agent')) {
              return new Response('<script>window.close();</script>', {
                headers: { 'content-type': 'text/html' },
              })
            }
            return redirectToPath(url, value.redirectAfter ?? '/notifications', {
              stripeConnected: 'true',
            })
          },
          err: (failure) => {
            if (StripeOAuthCallbackError.is(failure)) {
              return redirectToPath(url, '/notifications', { stripeError: failure.reason })
            }

            logger.error('stripe_oauth_callback_command_failed', { error: failure })
            return redirectToPath(url, '/notifications', { stripeError: 'persistence_failed' })
          },
        })
      },
    },
  },
})

function redirectToPath(url: URL, pathname: string, search: Record<string, string>) {
  const location = new URL(pathname, url)
  for (const [key, value] of Object.entries(search)) {
    location.searchParams.set(key, value)
  }

  return Response.redirect(location.toString(), 302)
}
