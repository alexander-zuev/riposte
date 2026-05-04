import type { ValidationIssue } from '@riposte/core'
import {
  AuthenticationError,
  AuthorizationError,
  EntityNotFoundError,
  InternalServerError,
  RateLimitError,
  ValidationError,
} from '@riposte/core'
import { createLogger } from '@riposte/core'
import { serializeForRpc } from '@server/entrypoints/functions/rpc-result'
import { isNotFound, isRedirect, redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { isTaggedError, Result } from 'better-result'

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

function statusForTaggedError(error: unknown): number {
  if (AuthenticationError.is(error)) return 401
  if (AuthorizationError.is(error)) return 403
  if (ValidationError.is(error)) return 400
  if (EntityNotFoundError.is(error)) return 404
  if (RateLimitError.is(error)) return 429
  return 500
}

/**
 * Single logging point for all server-side errors.
 *
 * Because this middleware wraps every server function and API route, code below
 * it must NEVER log-and-throw — just throw. The only reason to log inside a
 * handler is when you swallow the error (fire-and-forget, fallback).
 */
function handleFunctionError(error: unknown): never {
  if (isNotFound(error) || isRedirect(error)) {
    throw error
  }

  if (AuthenticationError.is(error)) {
    throw serializeForRpc(Result.err(error))
  }

  if (isTaggedError(error)) {
    logger.error(error.message, { error })
    throw serializeForRpc(Result.err(error))
  }

  if (error instanceof Error) {
    const zodIssues = parseZodIssues(error)
    if (zodIssues) {
      logger.warn('Validation error', { issues: zodIssues, issueCount: zodIssues.length })
      throw serializeForRpc(Result.err(new ValidationError({ issues: zodIssues })))
    }
  }

  logger.error('Unexpected error', { error })
  throw serializeForRpc(Result.err(new InternalServerError()))
}

function handleRouteError(error: unknown): Response {
  if (isNotFound(error) || isRedirect(error)) {
    throw error
  }

  if (isTaggedError(error)) {
    if (AuthenticationError.is(error)) {
      return Response.json({ error: error.message }, { status: 401 })
    }

    logger.error(error.message, { error })
    return Response.json({ error: error.message }, { status: statusForTaggedError(error) })
  }

  if (error instanceof Error) {
    const zodIssues = parseZodIssues(error)
    if (zodIssues) {
      logger.warn('Validation error', { issues: zodIssues, issueCount: zodIssues.length })
      const validationError = new ValidationError({ issues: zodIssues })
      return Response.json(
        { error: validationError.message, issues: validationError.issues },
        { status: 400 },
      )
    }
  }

  logger.error('Unexpected error', { error })
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}

/** Global — registered in functionMiddleware in createStart(). */
export const errorMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    handleFunctionError(error)
  }
})

/** Per-route — registered explicitly in API route .middleware([]) arrays. */
export const routeErrorMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      return handleRouteError(error)
    }
  },
)
