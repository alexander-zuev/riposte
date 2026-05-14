import { createCommand, createLogger, SlackOAuthCallbackError } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'

const logger = createLogger('slack-oauth')

export const Route = createFileRoute('/api/slack/oauth/callback')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      GET: async ({ request, context }) => {
        const config = getServerConfig()
        const { deps } = context
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const slackError = url.searchParams.get('error')

        if (slackError) {
          logger.warn('slack_oauth_error', { error: slackError })
          return redirectToSettings(config, { slackError })
        }

        if (!code || !state) {
          logger.warn('slack_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToSettings(config, { slackError: 'missing_params' })
        }

        const command = createCommand('HandleSlackOAuthCallback', {
          code,
          state,
        })
        const result = await deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: () => redirectToSettings(config, { slackConnected: 'true' }),
          err: (failure) => {
            if (SlackOAuthCallbackError.is(failure)) {
              return redirectToSettings(config, { slackError: failure.reason })
            }

            logger.error('slack_oauth_callback_command_failed', { error: failure })
            return redirectToSettings(config, { slackError: 'persistence_failed' })
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
