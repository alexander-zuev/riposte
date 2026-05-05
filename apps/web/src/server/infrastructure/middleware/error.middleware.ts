import type { ValidationIssue } from '@riposte/core'
import { AuthenticationError, InternalServerError, ValidationError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import { toServerFnRpc } from '@server/infrastructure/rpc/rpc-result'
import { isNotFound, isRedirect, redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { Result } from 'better-result'

const logger = createLogger('error-middleware')

// TanStack's inputValidator mangles ZodError into Error(JSON.stringify(issues)).
// Returns ValidationError if parseable, null otherwise.
function tryParseZodError(error: unknown): ValidationError | null {
  if (!(error instanceof Error)) return null
  try {
    const parsed = JSON.parse(error.message)
    if (Array.isArray(parsed) && parsed[0]?.path && parsed[0]?.message && parsed[0]?.code) {
      const issues = parsed as ValidationIssue[]
      logger.warn('Validation error', { issues, issueCount: issues.length })
      return new ValidationError({ issues })
    }
  } catch {
    // Not JSON — not a Zod error
  }
  return null
}

// Safety net for server fns. Tagged errors are returned as Result.err(), never thrown.
// This only catches: platform primitives (redirect/notFound), Zod validation, and bugs.
function handleFunctionError(error: unknown): never {
  if (isNotFound(error) || isRedirect(error)) throw error
  if (AuthenticationError.is(error)) throw redirect({ to: '/sign-in' })

  const validation = tryParseZodError(error)
  if (validation) throw toServerFnRpc(Result.err(validation))

  logger.error('Unexpected error', { error })
  throw toServerFnRpc(Result.err(new InternalServerError()))
}

// Safety net for API routes. Same scope: platform primitives, Zod, bugs.
function handleRouteError(error: unknown): Response {
  if (isNotFound(error) || isRedirect(error)) throw error
  if (AuthenticationError.is(error)) {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const validation = tryParseZodError(error)
  if (validation) {
    return Response.json({ error: validation.message, issues: validation.issues }, { status: 400 })
  }

  logger.error('Unexpected error', { error })
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}

// Global — registered in functionMiddleware in createStart().
export const errorMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    handleFunctionError(error)
  }
})

// Per-route — registered explicitly in API route .middleware([]) arrays.
export const routeErrorMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    try {
      return await next()
    } catch (error) {
      return handleRouteError(error)
    }
  },
)
