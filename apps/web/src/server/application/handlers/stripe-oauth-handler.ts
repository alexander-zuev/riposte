import {
  createLogger,
  StripeOAuthCallbackError,
  type DatabaseError,
  type HandleStripeOAuthCallback,
} from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { getServerConfig } from '@server/infrastructure/config'
import { consumeOAuthState } from '@server/infrastructure/stripe/stripe-oauth-state'
import {
  getRequiredOAuthTokenFields,
  STRIPE_APPS_ACCESS_TOKEN_TTL_MS,
} from '@server/infrastructure/stripe/stripe-oauth-token'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import StripeClient from 'stripe'

const logger = createLogger('stripe-oauth-handler')

type StripeOAuthHandlerError = DatabaseError | StripeOAuthCallbackError

export async function handleStripeOAuthCallback(
  command: HandleStripeOAuthCallback,
  { deps, tx }: HandlerContext,
): Promise<Result<void, StripeOAuthHandlerError>> {
  let userId: string | undefined

  if (command.state) {
    const stored = await consumeOAuthState(command.state, deps.kv.auth)
    if (stored.isErr() || !stored.value) {
      logger.warn('stripe_oauth_invalid_state', {
        state: command.state,
        error: stored.isErr() ? stored.error : undefined,
      })
      return Result.err(new StripeOAuthCallbackError({ reason: 'invalid_state' }))
    }
    userId = stored.value.userId
  }

  const config = getServerConfig()
  const secretKey =
    config.mode === 'development' || config.mode === 'test'
      ? config.stripe.testModeSecretKey
      : config.stripe.secretKey

  const stripe = new StripeClient(secretKey, {
    httpClient: StripeClient.createFetchHttpClient(),
  })

  const tokenResult = await stripeRequest('oauth.token', async () =>
    stripe.oauth.token({
      grant_type: 'authorization_code',
      code: command.code,
    }),
  )
  if (tokenResult.isErr()) {
    logger.warn('stripe_oauth_token_failed', {
      operation: tokenResult.error.operation,
      retryable: tokenResult.error.retryable,
      stripeRequestId: tokenResult.error.stripeRequestId,
    })
    return Result.err(
      new StripeOAuthCallbackError({
        reason: 'oauth_token_failed',
        cause: tokenResult.error,
      }),
    )
  }
  const token = tokenResult.value

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
    return Result.err(new StripeOAuthCallbackError({ reason: 'invalid_token_response' }))
  }

  if (!userId) {
    logger.warn('stripe_oauth_no_state_skip_persistence', {
      stripeAccountId: tokenFields.stripeAccountId,
      livemode: tokenFields.livemode,
    })
    return Result.ok(undefined)
  }

  const oauthStripe = new StripeClient(tokenFields.accessToken, {
    httpClient: StripeClient.createFetchHttpClient(),
  })
  const accountResult = await stripeRequest('accounts.retrieve', async () =>
    oauthStripe.accounts.retrieve(tokenFields.stripeAccountId),
  )
  if (accountResult.isErr()) {
    logger.warn('stripe_oauth_account_retrieve_failed', {
      operation: accountResult.error.operation,
      retryable: accountResult.error.retryable,
      stripeAccountId: tokenFields.stripeAccountId,
      stripeRequestId: accountResult.error.stripeRequestId,
    })
    return Result.err(
      new StripeOAuthCallbackError({
        reason: 'account_retrieve_failed',
        cause: accountResult.error,
      }),
    )
  }
  const account = accountResult.value
  const stripeBusinessName = account.business_profile?.name ?? null

  const now = new Date()
  const saved = await deps.repos.stripeConnections(tx).upsertConnectedAccount({
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
    return Result.err(
      new StripeOAuthCallbackError({
        reason: 'persistence_failed',
        cause: saved.error,
      }),
    )
  }

  logger.info('stripe_oauth_connection_persisted', {
    stripeConnectionId: saved.value.id,
    stripeAccountId: saved.value.stripeAccountId,
    livemode: saved.value.livemode,
    userId: saved.value.userId,
  })

  return Result.ok(undefined)
}
