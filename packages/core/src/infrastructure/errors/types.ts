/**
 * Validation issue - serializable structure for field-level errors
 * Decoupled from Zod internals to avoid type conflicts with TanStack Start
 */
export type ValidationIssue = {
  code: string
  path: (string | number)[]
  message: string
}

/**
 * Wire format for errors crossing the server→client boundary.
 *
 * Plain objects survive TanStack Start's seroval serialization (Error instances
 * lose custom properties). The `code` discriminant lets the client do exhaustive
 * switch in deserializeError().
 *
 * @deprecated — Will be replaced by Result.serialize() in Stage 10
 */
export type ServerError =
  | {
      code: 'VALIDATION_ERROR'
      message: string
      issues: ValidationIssue[]
      retryable: false
    }
  | { code: 'UNAUTHENTICATED'; message: string; retryable: false }
  | { code: 'UNAUTHORIZED'; message: string; retryable: false }
  | { code: 'NOT_FOUND'; message: string; retryable: false }
  | { code: 'RATE_LIMITED'; message: string; retryable: false }
  | { code: 'DOMAIN_ERROR'; message: string; retryable: boolean }
  | { code: 'INTERNAL_SERVER_ERROR'; message: string; retryable: false }

const SERVER_ERROR_CODES = new Set<string>([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'DOMAIN_ERROR',
  'INTERNAL_SERVER_ERROR',
])

/** Type guard for ServerError plain objects crossing the wire. */
export function isServerError(value: unknown): value is ServerError {
  if (typeof value !== 'object' || value === null) return false
  if (!('code' in value) || !('message' in value)) return false
  return SERVER_ERROR_CODES.has((value as Record<string, unknown>).code as string)
}

import {
  AuthenticationError,
  AuthorizationError,
  EntityNotFoundError,
  RateLimitError,
  ValidationError,
} from './domain.errors'

/** @deprecated — Will be replaced by Result.serialize() in Stage 6/7 */
export function serializeError(error: unknown): ServerError {
  if (ValidationError.is(error)) {
    return {
      code: 'VALIDATION_ERROR',
      message: error.message,
      issues: error.issues as ValidationIssue[],
      retryable: false,
    }
  }

  if (EntityNotFoundError.is(error)) {
    return { code: 'NOT_FOUND', message: error.message, retryable: false }
  }

  if (AuthenticationError.is(error)) {
    return { code: 'UNAUTHENTICATED', message: error.message, retryable: false }
  }

  if (AuthorizationError.is(error)) {
    return { code: 'UNAUTHORIZED', message: error.message, retryable: false }
  }

  if (RateLimitError.is(error)) {
    return { code: 'RATE_LIMITED', message: error.message, retryable: false }
  }

  return { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong', retryable: false }
}
