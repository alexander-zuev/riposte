import { createLogger } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { createFileRoute } from '@tanstack/react-router'
import Stripe from 'stripe'

const logger = createLogger('stripe-oauth')

export const Route = createFileRoute('/api/stripe/oauth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          logger.warn('stripe_oauth_failed', {
            error,
            errorDescription: url.searchParams.get('error_description'),
            hasState: !!state,
          })

          return Response.json(
            {
              ok: false,
              error,
              message: 'Stripe OAuth returned an error',
            },
            { status: 400 },
          )
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_code', { hasState: !!state })
          return Response.json(
            {
              ok: false,
              error: 'missing_code',
              message: 'Missing Stripe OAuth code',
            },
            { status: 400 },
          )
        }

        const config = getServerConfig()
        const stripe = new Stripe(config.stripe.secretKey, {
          httpClient: Stripe.createFetchHttpClient(),
        })
        const token = await stripe.oauth.token({
          grant_type: 'authorization_code',
          code,
        })

        logger.info('stripe_oauth_callback_received', {
          stripeUserId: token.stripe_user_id,
          livemode: token.livemode,
          scope: token.scope,
          hasState: !!state,
        })

        return Response.json({
          ok: true,
          stripeUserId: token.stripe_user_id,
          livemode: token.livemode,
          scope: token.scope,
          tokenType: token.token_type,
        })
      },
    },
  },
})
