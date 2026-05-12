import {
  CredentialEncryptionError,
  DatabaseError,
  StripeApiError,
  StripeConnectionUnavailableError,
  createLogger,
} from '@riposte/core'
import type { IStripeConnectionRepository } from '@server/domain/repository/interfaces'
import type { StripeConnection, StripeConnectionWithCredentials } from '@server/domain/stripe'
import { getServerConfig } from '@server/infrastructure/config'
import { getRequiredOAuthTokenFields } from '@server/infrastructure/stripe/stripe-oauth-token'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import Stripe from 'stripe'

const logger = createLogger('stripe-client-provider')

const REFRESH_BUFFER_MS = 5 * 60 * 1000

export type ResolveConnectionError = DatabaseError | StripeConnectionUnavailableError

export type GetClientError = ResolveConnectionError | StripeApiError | CredentialEncryptionError

export interface IStripeClientProvider {
  resolveConnection: (
    stripeAccountId: string | undefined,
  ) => Promise<Result<StripeConnection, ResolveConnectionError>>

  getForAccount: (stripeAccountId: string) => Promise<Result<Stripe, GetClientError>>
}

export class StripeClientProvider implements IStripeClientProvider {
  constructor(private readonly connectionRepo: IStripeConnectionRepository) {}

  // Validates that a Stripe account maps to an active connection. No credentials or refresh.
  // Used by webhook handlers that need to gate processing on connection status.
  async resolveConnection(
    stripeAccountId: string | undefined,
  ): Promise<Result<StripeConnection, ResolveConnectionError>> {
    if (!stripeAccountId) {
      logger.error('stripe_connection_missing_account')
      return Result.err(new StripeConnectionUnavailableError({ reason: 'missing_account' }))
    }

    const found = await this.connectionRepo.findByStripeAccountId(stripeAccountId)
    if (found.isErr()) return Result.err(found.error)

    return this.validateActive(stripeAccountId, found.value)
  }

  // Returns a Stripe SDK client with a valid (possibly refreshed) OAuth access token.
  // Used by agent/dispute handlers that need to call Stripe on behalf of a merchant.
  async getForAccount(stripeAccountId: string): Promise<Result<Stripe, GetClientError>> {
    const found = await this.connectionRepo.findWithCredentialsByStripeAccountId(stripeAccountId)
    if (found.isErr()) return Result.err(found.error)

    const validated = this.validateActive(stripeAccountId, found.value)
    if (validated.isErr()) return Result.err(validated.error)

    let connection = validated.value

    // Stripe Apps OAuth tokens expire in 1 hour; refresh proactively before expiry.
    if (this.isExpiredOrExpiring(connection)) {
      const refreshed = await this.refresh(connection)
      if (refreshed.isErr()) return Result.err(refreshed.error)
      connection = refreshed.value
    }

    return Result.ok(
      new Stripe(connection.accessToken, {
        httpClient: Stripe.createFetchHttpClient(),
      }),
    )
  }

  private validateActive<T extends StripeConnection>(
    stripeAccountId: string,
    connection: T | null,
  ): Result<T, StripeConnectionUnavailableError> {
    if (!connection) {
      logger.error('stripe_connection_unknown_account', { account: stripeAccountId })
      return Result.err(
        new StripeConnectionUnavailableError({
          reason: 'unknown_account',
          account: stripeAccountId,
        }),
      )
    }

    if (connection.status === 'revoked') {
      logger.warn('stripe_connection_revoked', { account: stripeAccountId })
      return Result.err(
        new StripeConnectionUnavailableError({
          reason: 'revoked_connection',
          account: stripeAccountId,
        }),
      )
    }

    return Result.ok(connection)
  }

  private isExpiredOrExpiring(connection: StripeConnectionWithCredentials): boolean {
    return connection.accessTokenExpiresAt.getTime() <= Date.now() + REFRESH_BUFFER_MS
  }

  private async refresh(
    connection: StripeConnectionWithCredentials,
  ): Promise<
    Result<
      StripeConnectionWithCredentials,
      StripeApiError | DatabaseError | CredentialEncryptionError
    >
  > {
    const config = getServerConfig()
    const appSecretKey =
      config.mode === 'development' || config.mode === 'test'
        ? config.stripe.testModeSecretKey
        : config.stripe.secretKey

    const platformStripe = new Stripe(appSecretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    })

    logger.info('stripe_token_refresh_started', {
      stripeAccountId: connection.stripeAccountId,
      expiresAt: connection.accessTokenExpiresAt.toISOString(),
    })

    const tokenResult = await stripeRequest('oauth.token.refresh', () =>
      platformStripe.oauth.token({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      }),
    )
    if (tokenResult.isErr()) return Result.err(tokenResult.error)

    const tokenFields = getRequiredOAuthTokenFields(tokenResult.value)
    if (!tokenFields) {
      return Result.err(
        new StripeApiError({
          operation: 'oauth.token.refresh',
          cause: new Error('Refresh response missing required fields'),
          retryable: false,
        }),
      )
    }

    const saved = await this.connectionRepo.refreshCredentials({
      stripeAccountId: connection.stripeAccountId,
      accessToken: tokenFields.accessToken,
      refreshToken: tokenFields.refreshToken,
    })
    if (saved.isErr()) return Result.err(saved.error)

    logger.info('stripe_token_refresh_completed', {
      stripeAccountId: connection.stripeAccountId,
      newExpiresAt: saved.value.accessTokenExpiresAt.toISOString(),
    })

    return Result.ok(saved.value)
  }
}
