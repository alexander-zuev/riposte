import { TaggedError } from 'better-result'

import type { ValidationIssue } from './types'

export class AuthenticationError extends TaggedError('AuthenticationError')<{
  message: string
  retryable: false
}>() {
  constructor(args?: { message?: string }) {
    super({
      message:
        args?.message ?? 'Session expired or invalid. Please refresh the page or sign in again.',
      retryable: false,
    })
  }
}

export class AuthorizationError extends TaggedError('AuthorizationError')<{
  message: string
  retryable: false
}>() {
  constructor(args?: { message?: string }) {
    super({
      message: args?.message ?? 'You do not have permission to perform this action',
      retryable: false,
    })
  }
}

export class ValidationError extends TaggedError('ValidationError')<{
  issues: ValidationIssue[]
  message: string
  retryable: false
}>() {
  constructor(args: { issues: ValidationIssue[]; message?: string }) {
    super({
      issues: args.issues,
      message: args.message ?? 'Validation failed',
      retryable: false,
    })
  }
}

export class EntityNotFoundError extends TaggedError('EntityNotFoundError')<{
  entity: string
  id?: string
  message: string
  retryable: false
}>() {
  constructor(args: { entity: string; id?: string }) {
    super({
      ...args,
      message: args.id ? `${args.entity} "${args.id}" not found` : `${args.entity} not found`,
      retryable: false,
    })
  }
}

export class RateLimitError extends TaggedError('RateLimitError')<{
  message: string
  retryable: false
}>() {
  constructor(args?: { message?: string }) {
    super({
      message: args?.message ?? 'Too many requests. Please try again later.',
      retryable: false,
    })
  }
}

export type DomainError =
  | AuthenticationError
  | AuthorizationError
  | ValidationError
  | EntityNotFoundError
  | RateLimitError
