import { SlackApiError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import {
  ErrorCode as SlackWebApiErrorCode,
  type WebAPIHTTPError,
  type WebAPIPlatformError,
  type WebAPIRateLimitedError,
  type WebAPIRequestError,
} from '@slack/web-api'
import {
  ErrorCode as SlackWebhookErrorCode,
  type IncomingWebhookHTTPError,
  type IncomingWebhookRequestError,
} from '@slack/webhook'
import { Result } from 'better-result'

type SlackApiOperation = 'oauth.v2.access' | 'incoming_webhook.send'

export async function slackRequest<T>(
  operation: SlackApiOperation,
  request: () => Promise<T>,
): Promise<Result<T, SlackApiError>> {
  return Result.tryPromise(
    {
      try: request,
      catch: (cause) => toSlackApiError(operation, cause),
    },
    RETRY.externalApi,
  )
}

export function toSlackApiError(operation: SlackApiOperation, cause: unknown): SlackApiError {
  const webApiError = getSlackWebApiError(cause)
  if (webApiError) return toSlackWebApiError(operation, webApiError)

  const webhookError = getSlackWebhookError(cause)
  if (webhookError) return toSlackWebhookError(operation, webhookError)

  return new SlackApiError({
    operation,
    cause,
    retryable: isTransientError(cause),
  })
}

function toSlackWebApiError(
  operation: SlackApiOperation,
  error: WebAPIPlatformError | WebAPIHTTPError | WebAPIRateLimitedError | WebAPIRequestError,
): SlackApiError {
  switch (error.code) {
    case SlackWebApiErrorCode.PlatformError:
      return new SlackApiError({
        operation,
        cause: error,
        slackErrorCode: error.data.error,
        retryable: isRetryableSlackPlatformError(error.data.error),
      })
    case SlackWebApiErrorCode.HTTPError:
      return new SlackApiError({
        operation,
        cause: error,
        status: error.statusCode,
        retryable: isRetryableSlackStatus(error.statusCode),
      })
    case SlackWebApiErrorCode.RateLimitedError:
      return new SlackApiError({
        operation,
        cause: error,
        status: 429,
        slackErrorCode: 'rate_limited',
        retryable: true,
      })
    case SlackWebApiErrorCode.RequestError:
      return new SlackApiError({
        operation,
        cause: error,
        retryable: isTransientError(error.original),
      })
    default:
      return new SlackApiError({
        operation,
        cause: error,
        retryable: isTransientError(error),
      })
  }
}

function toSlackWebhookError(
  operation: SlackApiOperation,
  error: IncomingWebhookHTTPError | IncomingWebhookRequestError,
): SlackApiError {
  switch (error.code) {
    case SlackWebhookErrorCode.HTTPError: {
      const response = getAxiosResponse(error.original)
      return new SlackApiError({
        operation,
        cause: error,
        status: response?.status,
        slackErrorCode: typeof response?.data === 'string' ? response.data : undefined,
        retryable: isRetryableSlackStatus(response?.status),
      })
    }
    case SlackWebhookErrorCode.RequestError:
      return new SlackApiError({
        operation,
        cause: error,
        retryable: isTransientError(error.original),
      })
    default:
      return new SlackApiError({
        operation,
        cause: error,
        retryable: isTransientError(error),
      })
  }
}

function isRetryableSlackStatus(status: number | undefined): boolean {
  if (!status) return false
  return status === 429 || status >= 500
}

function isRetryableSlackPlatformError(error: string): boolean {
  return error === 'rate_limited' || error === 'fatal_error' || error === 'internal_error'
}

function getSlackWebApiError(
  cause: unknown,
): WebAPIPlatformError | WebAPIHTTPError | WebAPIRateLimitedError | WebAPIRequestError | null {
  if (!isObjectWithCode(cause)) return null

  switch (cause.code) {
    case SlackWebApiErrorCode.PlatformError:
    case SlackWebApiErrorCode.HTTPError:
    case SlackWebApiErrorCode.RateLimitedError:
    case SlackWebApiErrorCode.RequestError:
      return cause as
        | WebAPIPlatformError
        | WebAPIHTTPError
        | WebAPIRateLimitedError
        | WebAPIRequestError
    default:
      return null
  }
}

function getSlackWebhookError(
  cause: unknown,
): IncomingWebhookHTTPError | IncomingWebhookRequestError | null {
  if (!isObjectWithCode(cause)) return null

  switch (cause.code) {
    case SlackWebhookErrorCode.HTTPError:
    case SlackWebhookErrorCode.RequestError:
      return cause as IncomingWebhookHTTPError | IncomingWebhookRequestError
    default:
      return null
  }
}

function isObjectWithCode(value: unknown): value is { code: string } {
  return typeof value === 'object' && value !== null && 'code' in value
}

function getAxiosResponse(error: Error): { status?: number; data?: unknown } | null {
  if (!('response' in error)) return null
  const response = (error as { response?: unknown }).response
  if (typeof response !== 'object' || response === null) return null
  return response as { status?: number; data?: unknown }
}
