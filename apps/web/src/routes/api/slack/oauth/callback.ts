import { createCommand, createLogger, SlackOAuthCallbackError } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute, redirect } from '@tanstack/react-router'

const logger = createLogger('slack-oauth')

export const Route = createFileRoute('/api/slack/oauth/callback')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      GET: async ({ request, context }) => {
        const { deps } = context
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const slackError = url.searchParams.get('error')

        if (slackError) {
          logger.warn('slack_oauth_error', { error: slackError })
          return redirectToNotifications({ slackError })
        }

        if (!code || !state) {
          logger.warn('slack_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToNotifications({ slackError: 'missing_params' })
        }

        const command = createCommand('HandleSlackOAuthCallback', {
          code,
          state,
        })
        const result = await deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: () => redirectToNotifications({ slackConnected: 'true' }),
          err: (failure) => {
            if (SlackOAuthCallbackError.is(failure)) {
              return redirectToNotifications({ slackError: failure.reason })
            }

            logger.error('slack_oauth_callback_command_failed', { error: failure })
            return redirectToNotifications({ slackError: 'persistence_failed' })
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
