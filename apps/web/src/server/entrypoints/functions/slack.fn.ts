import { createLogger, toServerFnRpc } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createSlackOAuthState } from '@server/infrastructure/slack/slack-oauth-state'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'

const logger = createLogger('slack.fn')
const SLACK_DEV_REDIRECT_URI = 'https://tunnel.riposte.sh/api/slack/oauth/callback'

export const getSlackOAuthUrl = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const config = getServerConfig()
    const userId = context.user.id
    const state = await createSlackOAuthState(userId, context.deps.kv.auth)
    if (state.isErr()) return toServerFnRpc(Result.err(state.error))

    const redirectUri =
      config.mode === 'production'
        ? `${config.appUrl}/api/slack/oauth/callback`
        : SLACK_DEV_REDIRECT_URI

    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      scope: 'incoming-webhook',
      redirect_uri: redirectUri,
      state: state.value,
    })

    logger.info('slack_oauth_initiated', { userId, redirectUri })

    return toServerFnRpc(
      Result.ok({
        url: `https://slack.com/oauth/v2/authorize?${params.toString()}`,
      }),
    )
  })
