import { StripeApiError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'
import Stripe from 'stripe'

type StripeError = InstanceType<typeof Stripe.errors.StripeError>

export async function stripeRequest<T>(
  operation: string,
  request: () => Promise<T>,
): Promise<Result<T, StripeApiError>> {
  return Result.tryPromise(
    {
      try: request,
      catch: (cause) => toStripeApiError(operation, cause),
    },
    RETRY.externalApi,
  )
}

export function toStripeApiError(operation: string, cause: unknown): StripeApiError {
  const stripe = getStripeError(cause)
  if (stripe) {
    return new StripeApiError({
      operation,
      cause,
      retryable: isRetryableStripeError(stripe),
      message: stripe.message,
      stripeRequestId: stripe.requestId,
    })
  }

  return new StripeApiError({
    operation,
    cause,
    retryable: isTransientError(cause),
  })
}

function isRetryableStripeError(error: StripeError): boolean {
  if (error.statusCode && isRetryableStatus(error.statusCode)) return true

  if (error instanceof Stripe.errors.StripeConnectionError) return true
  if (error instanceof Stripe.errors.StripeAPIError) return true
  if (error instanceof Stripe.errors.StripeRateLimitError) return true

  return false
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 409 || statusCode === 429 || statusCode >= 500
}

function getStripeError(cause: unknown): StripeError | undefined {
  if (cause instanceof Stripe.errors.StripeError) return cause
  return undefined
}
