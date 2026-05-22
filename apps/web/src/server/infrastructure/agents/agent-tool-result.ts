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

const logger = createLogger('agent-tool-result')

export function resultToAgentToolResponse<T extends Record<string, unknown>, E>(
  result: Result<T, E>,
  options: {
    ok?: (value: T) => Record<string, unknown>
    err?: (error: E) => Record<string, unknown> | undefined
  } = {},
): Record<string, unknown> {
  return result.match({
    ok: (value) => ({ ok: true, ...value, ...options.ok?.(value) }),
    err: (error) => options.err?.(error) ?? agentToolErrorResponse(error),
  })
}

export function agentToolErrorResponse(error: unknown): { ok: false; error: string } {
  if (ValidationError.is(error)) {
    return { ok: false, error: error.message }
  }

  if (AuthenticationError.is(error)) {
    return { ok: false, error: 'Unauthenticated' }
  }

  if (AuthorizationError.is(error)) {
    return { ok: false, error: 'Forbidden' }
  }

  if (EntityNotFoundError.is(error)) {
    return { ok: false, error: error.message }
  }

  if (RateLimitError.is(error)) {
    return { ok: false, error: error.message }
  }

  if (InternalServerError.is(error)) {
    logger.error('agent_tool_internal_server_error', { error })
    return { ok: false, error: 'Internal server error' }
  }

  if (isRetryable(error)) {
    logger.error('agent_tool_retryable_error', { error })
    return { ok: false, error: 'Service temporarily unavailable' }
  }

  logger.error('agent_tool_unexpected_error', { error })
  return { ok: false, error: 'Internal server error' }
}

function isRetryable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && Reflect.get(error, 'retryable') === true
}
