import { RateLimitError, ValidationError } from '@riposte/core/client'
import type { ServerError } from '@riposte/core/client'
import { notFound, redirect } from '@tanstack/react-router'

export function throwServerError(error: ServerError): never {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      throw redirect({ to: '/' })
    case 'UNAUTHORIZED':
      throw redirect({ to: '/' })
    case 'NOT_FOUND':
      throw notFound()
    case 'RATE_LIMITED':
      throw new RateLimitError(error.message)
    case 'VALIDATION_ERROR':
      throw new ValidationError(error.issues, error.message)
    case 'DOMAIN_ERROR':
    case 'INTERNAL_SERVER_ERROR':
      throw Object.assign(new Error(error.message), { code: error.code })
    default: {
      const exhaustive: never = error
      throw new Error((exhaustive as ServerError).message)
    }
  }
}
