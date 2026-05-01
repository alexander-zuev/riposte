import { DomainError } from './base.errors'
import type { ValidationIssue } from './types'

export class AuthenticationError extends DomainError {
  constructor(
    message = 'Session expired or invalid. Please refresh the page or sign in again.',
    context?: Record<string, unknown>,
  ) {
    super(message, context, 'UNAUTHENTICATED')
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, undefined, 'UNAUTHORIZED')
  }
}

export class ValidationError extends DomainError {
  constructor(
    public readonly issues: ValidationIssue[],
    message: string = 'Validation failed',
  ) {
    super(message, { issues }, 'VALIDATION_ERROR')
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} "${id}" not found` : `${entity} not found`, { entity, id }, 'NOT_FOUND')
  }
}

export class RateLimitError extends DomainError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, undefined, 'RATE_LIMITED')
  }
}
