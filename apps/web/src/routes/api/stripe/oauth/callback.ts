import { createLogger } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { withDepsRequest } from '@server/infrastructure/middleware/deps.middleware'
import { consumeOAuthState } from '@server/infrastructure/stripe/stripe-oauth-state'
import {
  getRequiredOAuthTokenFields,
  STRIPE_APPS_ACCESS_TOKEN_TTL_MS,
} from '@server/infrastructure/stripe/stripe-oauth-token'
import { createFileRoute } from '@tanstack/react-router'
import Stripe from 'stripe'

const logger = createLogger('stripe-oauth')

export const Route = createFileRoute('/api/stripe/oauth/callback')({
  server: {
    middleware: [withDepsRequest],
    handlers: {
      GET: async ({ request, context }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')
        const config = getServerConfig()

        if (error) {
          logger.warn('stripe_oauth_error', {
            error,
            description: url.searchParams.get('error_description'),
          })
          return redirectToSettings(config, { stripeError: error })
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          return redirectToSettings(config, { stripeError: 'missing_params' })
        }

        const { deps } = context
        let userId: string | undefined

        if (state) {
          const stored = await consumeOAuthState(state, deps.kv.auth)
          if (stored.isErr() || !stored.value) {
            logger.warn('stripe_oauth_invalid_state', { state })
            return redirectToSettings(config, { stripeError: 'invalid_state' })
          }
          userId = stored.value.userId
        }

        const secretKey =
          config.mode === 'production' ? config.stripe.secretKey : config.stripe.testModeSecretKey
        const stripe = new Stripe(secretKey, {
          httpClient: Stripe.createFetchHttpClient(),
        })

        const token = await stripe.oauth.token({
          grant_type: 'authorization_code',
          code,
        })

        logger.info('stripe_oauth_token_response', {
          stripeUserId: token.stripe_user_id,
          livemode: token.livemode,
          scope: token.scope,
          tokenType: token.token_type,
          hasAccessToken: !!token.access_token,
          hasRefreshToken: !!token.refresh_token,
        })

        const tokenFields = getRequiredOAuthTokenFields(token)
        if (!tokenFields) {
          logger.warn('stripe_oauth_invalid_token_response', {
            hasStripeAccountId: !!token.stripe_user_id,
            hasAccessToken: !!token.access_token,
            hasRefreshToken: !!token.refresh_token,
            hasLivemode: typeof token.livemode === 'boolean',
          })
          return redirectToSettings(config, { stripeError: 'invalid_token_response' })
        }

        if (!userId) {
          logger.warn('stripe_oauth_no_state_skip_persistence', {
            stripeAccountId: tokenFields.stripeAccountId,
            livemode: tokenFields.livemode,
          })
          return redirectToSettings(config, { stripeConnected: 'true' })
        }

        const oauthStripe = new Stripe(tokenFields.accessToken, {
          httpClient: Stripe.createFetchHttpClient(),
        })
        const account = await oauthStripe.accounts.retrieve(tokenFields.stripeAccountId)
        const stripeBusinessName = account.business_profile?.name ?? null

        const now = new Date()
        const saved = await deps.repos.stripeConnections(deps.db()).upsertConnectedAccount({
          userId,
          stripeAccountId: tokenFields.stripeAccountId,
          stripeBusinessName,
          livemode: tokenFields.livemode,
          scope: token.scope,
          tokenType: token.token_type,
          accessToken: tokenFields.accessToken,
          refreshToken: tokenFields.refreshToken,
          accessTokenExpiresAt: new Date(now.getTime() + STRIPE_APPS_ACCESS_TOKEN_TTL_MS),
          connectedAt: now,
        })

        if (saved.isErr()) {
          logger.error('stripe_oauth_persist_failed', { error: saved.error })
          return redirectToSettings(config, { stripeError: 'persistence_failed' })
        }

        logger.info('stripe_oauth_connection_persisted', {
          stripeConnectionId: saved.value.id,
          stripeAccountId: saved.value.stripeAccountId,
          livemode: saved.value.livemode,
          userId: saved.value.userId,
        })

        return redirectToSettings(config, { stripeConnected: 'true' })
      },
    },
  },
})

function redirectToSettings(
  config: ReturnType<typeof getServerConfig>,
  search: Record<string, string>,
) {
  const url = new URL('/settings', config.appUrl)
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value)
  return Response.redirect(url.toString(), 302)
}
