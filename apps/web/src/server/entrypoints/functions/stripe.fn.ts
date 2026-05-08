import { createLogger, toServerFnRpc } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createOAuthState } from '@server/infrastructure/stripe/stripe-oauth-state'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'

const logger = createLogger('stripe.fn')
const STRIPE_APP_CLIENT_ID = 'ca_UTQuSndRIZIb31NTd1oAtPSOYTMl1MFw'
const STRIPE_APP_INSTALL_LINK_ID = 'chnlink_61UdsCZhNvQAInh1H41RbvfiqIYDIJHE'
const STRIPE_APP_DEV_REDIRECT_URI = 'https://tunnel.riposte.sh/api/stripe/oauth/callback'

export const getStripeOAuthUrl = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const config = getServerConfig()

    const userId = context.user.id
    const state = await createOAuthState(userId, context.deps.kv.auth)
    if (state.isErr()) return toServerFnRpc(Result.err(state.error))

    // Stripe Apps only accepts redirect URIs registered in apps/stripe-app/stripe-app.json.
    const redirectUri =
      config.mode === 'production'
        ? `${config.appUrl}/api/stripe/oauth/callback`
        : STRIPE_APP_DEV_REDIRECT_URI

    const params = new URLSearchParams({
      client_id: STRIPE_APP_CLIENT_ID,
      response_type: 'code',
      scope: 'stripe_apps',
      redirect_uri: redirectUri,
      state: state.value,
    })

    const url =
      `https://marketplace.stripe.com/oauth/v2/${STRIPE_APP_INSTALL_LINK_ID}/authorize` +
      `?${params.toString()}`

    logger.info('stripe_oauth_initiated', { userId, redirectUri })

    return toServerFnRpc(Result.ok({ url }))
  })
