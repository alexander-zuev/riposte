import { createLogger } from '@riposte/core'
import { createAppDeps } from '@server/infrastructure/app-deps'
import { getServerConfig } from '@server/infrastructure/config'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { env as workerEnv } from 'cloudflare:workers'
import Stripe from 'stripe'

const logger = createLogger('stripe-oauth')

const KV_PREFIX = 'stripe_oauth_state:'
const STATE_TTL_SECONDS = 600
const STRIPE_APPS_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000

export type StripeConnectionStatus = 'active' | 'revoked' | 'needs_reauth'

export type UpsertStripeConnectionInput = {
  userId: string
  stripeAccountId: string
  livemode: boolean
  status: StripeConnectionStatus
  scope?: string
  tokenType?: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  connectedAt: Date
}

export const Route = createFileRoute('/api/stripe/oauth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        if (error) {
          logger.warn('stripe_oauth_error', {
            error,
            description: url.searchParams.get('error_description'),
          })
          throw redirect({ to: '/setup', search: { stripeError: error } })
        }

        if (!code) {
          logger.warn('stripe_oauth_missing_params', { hasCode: !!code, hasState: !!state })
          throw redirect({ to: '/setup', search: { stripeError: 'missing_params' } })
        }

        const config = getServerConfig()
        let userId: string | undefined

        if (state) {
          const stored = await config.kvStorage.get(`${KV_PREFIX}${state}`)
          if (!stored) {
            logger.warn('stripe_oauth_invalid_state', { state })
            throw redirect({ to: '/setup', search: { stripeError: 'invalid_state' } })
          }
          await config.kvStorage.delete(`${KV_PREFIX}${state}`)
          userId = (JSON.parse(stored) as { userId: string }).userId
        }

        const stripe = new Stripe(config.stripe.secretKey, {
          httpClient: Stripe.createFetchHttpClient(),
        })

        const token = await stripe.oauth.token({
          grant_type: 'authorization_code',
          code,
        })

        logger.info('stripe_oauth_token_response', { token: JSON.stringify(token) })

        const tokenFields = getRequiredOAuthTokenFields(token)
        if (!tokenFields) {
          logger.warn('stripe_oauth_invalid_token_response', {
            hasStripeAccountId: !!token.stripe_user_id,
            hasAccessToken: !!token.access_token,
            hasRefreshToken: !!token.refresh_token,
            hasLivemode: typeof token.livemode === 'boolean',
          })
          throw redirect({ to: '/setup', search: { stripeError: 'invalid_token_response' } })
        }

        if (!userId) {
          logger.warn('stripe_oauth_no_state_skip_persistence', {
            stripeAccountId: tokenFields.stripeAccountId,
            livemode: tokenFields.livemode,
          })
          throw redirect({ to: '/setup', search: { stripeConnected: 'true' } })
        }

        const now = new Date()
        const deps = createAppDeps(workerEnv, { waitUntil: config.waitUntil })
        const saved = await deps.repos.stripeConnections(deps.db()).upsertConnectedAccount({
          userId,
          stripeAccountId: tokenFields.stripeAccountId,
          livemode: tokenFields.livemode,
          status: 'active',
          scope: token.scope,
          tokenType: token.token_type,
          accessToken: tokenFields.accessToken,
          refreshToken: tokenFields.refreshToken,
          accessTokenExpiresAt: new Date(now.getTime() + STRIPE_APPS_ACCESS_TOKEN_TTL_MS),
          connectedAt: now,
        })

        if (saved.isErr()) {
          logger.error('stripe_oauth_persist_failed', { error: saved.error })
          throw redirect({ to: '/setup', search: { stripeError: 'persistence_failed' } })
        }

        logger.info('stripe_oauth_connection_persisted', {
          stripeConnectionId: saved.value.id,
          stripeAccountId: saved.value.stripeAccountId,
          livemode: saved.value.livemode,
          userId: saved.value.userId,
        })

        throw redirect({ to: '/setup', search: { stripeConnected: 'true' } })
      },
    },
  },
})

/**
 * Generate a state token and store it in KV before redirecting to Stripe OAuth.
 * Call this from a server function that has the authenticated user context.
 */
export async function createOAuthState(userId: string, kv: KVNamespace): Promise<string> {
  const state = crypto.randomUUID()
  await kv.put(`${KV_PREFIX}${state}`, JSON.stringify({ userId }), {
    expirationTtl: STATE_TTL_SECONDS,
  })
  return state
}

type StripeOAuthToken = Awaited<ReturnType<Stripe['oauth']['token']>>

function getRequiredOAuthTokenFields(token: StripeOAuthToken):
  | {
      stripeAccountId: string
      livemode: boolean
      accessToken: string
      refreshToken: string
    }
  | undefined {
  if (!token.stripe_user_id) return undefined
  if (typeof token.livemode !== 'boolean') return undefined
  if (!token.access_token) return undefined
  if (!token.refresh_token) return undefined

  return {
    stripeAccountId: token.stripe_user_id,
    livemode: token.livemode,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
  }
}
