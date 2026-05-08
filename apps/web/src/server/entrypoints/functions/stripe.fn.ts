import { createLogger } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createOAuthState } from '@server/infrastructure/stripe/stripe-oauth-state'
import { createServerFn } from '@tanstack/react-start'

const logger = createLogger('stripe.fn')

export const getStripeOAuthUrl = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const config = getServerConfig()

    const userId = context.user.id
    const state = await createOAuthState(userId, context.deps.kv.auth)
    if (state.isErr()) throw state.error

    // TODO: move to env (STRIPE_CLIENT_ID) and config
    const clientId = 'ca_UTQuSndRIZIb31NTd1oAtPSOYTMl1MFw'
    const redirectUri = `${config.appUrl}/api/stripe/oauth/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'stripe_apps',
      redirect_uri: redirectUri,
      state: state.value,
    })

    const url = `https://marketplace.stripe.com/oauth/v2/authorize?${params.toString()}`

    logger.info('stripe_oauth_initiated', { userId, redirectUri })

    return { url }
  })
