import type { ValidationIssue } from '@riposte/core'
import { AuthenticationError, BaseError, ValidationError, serializeError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import { isNotFound, isRedirect, redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

const logger = createLogger('error-middleware')

/** TanStack's inputValidator mangles ZodError into Error(JSON.stringify(issues)). */
function parseZodIssues(error: Error): ValidationIssue[] | null {
  try {
    const parsed = JSON.parse(error.message)
    if (Array.isArray(parsed) && parsed[0]?.path && parsed[0]?.message && parsed[0]?.code) {
      return parsed as ValidationIssue[]
    }
  } catch {
    // Not JSON — not a Zod error
  }
  return null
}

/**
 * Serialize errors to plain objects and throw. Plain objects survive TanStack's
 * seroval serialization (Error instances lose custom properties). rpc() catches
 * via isServerError() on the client.
 *
 * Three paths:
 * 1. BaseError (handled) — serialize, no log
 * 2. TanStack-mangled ZodError — reconstruct as ValidationError, warn log
 *    (inputValidator only runs server-side; client middleware cannot intercept)
 * 3. Unknown — logger.error sends to Sentry via hook, serialize as INTERNAL_SERVER_ERROR
 */
function handleError(error: unknown): never {
  if (isNotFound(error) || isRedirect(error)) {
    throw error
  }

  if (error instanceof AuthenticationError) {
    throw redirect({ to: '/' })
  }

  if (error instanceof BaseError) {
    throw serializeError(error)
  }

  if (error instanceof Error) {
    const zodIssues = parseZodIssues(error)
    if (zodIssues) {
      logger.warn('Validation error', { issues: zodIssues, issueCount: zodIssues.length })
      throw serializeError(new ValidationError(zodIssues))
    }
  }

  logger.error('Unexpected error', { error })
  throw serializeError(error)
}

/** Global — registered in functionMiddleware in createStart(). */
export const errorMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    handleError(error)
  }
})

/** Per-route — registered explicitly in API route .middleware([]) arrays. */
export const routeErrorMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      handleError(error)
    }
  },
)
