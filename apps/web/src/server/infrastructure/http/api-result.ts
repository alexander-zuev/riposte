import {
  AuthenticationError,
  AuthorizationError,
  EntityNotFoundError,
  InternalServerError,
  RateLimitError,
  ValidationError,
  createLogger,
} from '@riposte/core'
import type { Result } from 'better-result'

const logger = createLogger('api-result')

export function resultToApiResponse<T, E>(
  result: Result<T, E>,
  options: {
    ok?: (value: T) => Response
    err?: (error: E) => Response | undefined
  } = {},
): Response {
  return result.match({
    ok: (value) => options.ok?.(value) ?? Response.json(value),
    err: (error) => options.err?.(error) ?? apiErrorResponse(error),
  })
}

/**
 * Default JSON mapping for expected Result errors at HTTP API boundaries.
 */
export function apiErrorResponse(error: unknown): Response {
  if (ValidationError.is(error)) {
    return Response.json({ error: error.message, issues: error.issues }, { status: 400 })
  }

  if (AuthenticationError.is(error)) {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  if (AuthorizationError.is(error)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (EntityNotFoundError.is(error)) {
    return Response.json({ error: error.message }, { status: 404 })
  }

  if (RateLimitError.is(error)) {
    return Response.json({ error: error.message }, { status: 429 })
  }

  if (InternalServerError.is(error)) {
    logger.error('api_internal_server_error', { error })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (isRetryable(error)) {
    logger.error('api_retryable_error', { error })
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }

  logger.error('api_unexpected_error', { error })
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}

function isRetryable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'retryable') === true
}
