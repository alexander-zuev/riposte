import { TaggedError } from 'better-result'

export class DuplicateMessageError extends TaggedError('DuplicateMessageError')<{
  messageId: string
  message: string
  retryable: false
}>() {
  constructor(args: { messageId: string }) {
    super({
      messageId: args.messageId,
      message: `Duplicate message: ${args.messageId}`,
      retryable: false,
    })
  }
}

export class QueueError extends TaggedError('QueueError')<{
  message: string
  cause: unknown
  retryable: boolean
}>() {
  constructor(args: { message: string; cause: unknown; retryable: boolean }) {
    super({ message: args.message, cause: args.cause, retryable: args.retryable })
  }
}

export class DOUnreachableError extends TaggedError('DOUnreachableError')<{
  message: string
  cause: unknown
  retryable: boolean
}>() {
  constructor(args: { cause: unknown; retryable: boolean }) {
    super({
      message: 'Failed to reach Durable Object',
      cause: args.cause,
      retryable: args.retryable,
    })
  }
}

export class WorkflowError extends TaggedError('WorkflowError')<{
  message: string
  operation: 'start' | 'status' | 'pause' | 'resume' | 'terminate'
  workflowName: string
  instanceId: string
  cause: unknown
  retryable: boolean
}>() {
  constructor(args: {
    operation: 'start' | 'status' | 'pause' | 'resume' | 'terminate'
    workflowName: string
    instanceId: string
    cause: unknown
    retryable: boolean
  }) {
    super({
      message: `Workflow ${args.operation} failed for ${args.workflowName}:${args.instanceId}`,
      operation: args.operation,
      workflowName: args.workflowName,
      instanceId: args.instanceId,
      cause: args.cause,
      retryable: args.retryable,
    })
  }
}

export class EmailServiceError extends TaggedError('EmailServiceError')<{
  message: string
  operation: 'configuration' | 'send'
  provider: string
  cause?: unknown
  retryable: boolean
}>() {
  constructor(args: {
    message: string
    operation: 'configuration' | 'send'
    provider: string
    cause?: unknown
    retryable?: boolean
  }) {
    super({
      message: args.message,
      operation: args.operation,
      provider: args.provider,
      cause: args.cause,
      retryable: args.retryable ?? args.operation === 'send',
    })
  }
}

export class KVError extends TaggedError('KVError')<{
  message: string
  operation: 'get' | 'put' | 'delete' | 'list'
  key: string
  cause: unknown
  retryable: boolean
}>() {
  constructor(args: {
    operation: 'get' | 'put' | 'delete' | 'list'
    key: string
    cause: unknown
    retryable: boolean
  }) {
    super({
      message: `KV ${args.operation} failed for key "${args.key}"`,
      operation: args.operation,
      key: args.key,
      cause: args.cause,
      retryable: args.retryable,
    })
  }
}

export class CredentialEncryptionError extends TaggedError('CredentialEncryptionError')<{
  message: string
  operation: 'encrypt' | 'decrypt'
  cause: unknown
  retryable: false
}>() {
  constructor(args: { operation: 'encrypt' | 'decrypt'; cause: unknown }) {
    super({
      message: `Credential ${args.operation} failed`,
      operation: args.operation,
      cause: args.cause,
      retryable: false,
    })
  }
}

export class StripeApiError extends TaggedError('StripeApiError')<{
  message: string
  operation: string
  cause: unknown
  retryable: boolean
  stripeRequestId?: string
}>() {
  constructor(args: {
    operation: string
    cause: unknown
    retryable: boolean
    message?: string
    stripeRequestId?: string
  }) {
    super({
      message: args.message ?? `Stripe ${args.operation} failed`,
      operation: args.operation,
      cause: args.cause,
      retryable: args.retryable,
      stripeRequestId: args.stripeRequestId,
    })
  }
}

type StripeConnectionUnavailableInput =
  | { reason: 'missing_account' }
  | { reason: 'unknown_account'; account: string }
  | { reason: 'revoked_connection'; account: string }

export class StripeConnectionUnavailableError extends TaggedError(
  'StripeConnectionUnavailableError',
)<{
  message: string
  reason: 'missing_account' | 'unknown_account' | 'revoked_connection'
  account?: string
  retryable: false
}>() {
  constructor(args: StripeConnectionUnavailableInput) {
    super({
      reason: args.reason,
      account: 'account' in args ? args.account : undefined,
      message: `Stripe connection unavailable: ${args.reason}`,
      retryable: false,
    })
  }
}

export class StripeOAuthCallbackError extends TaggedError('StripeOAuthCallbackError')<{
  message: string
  reason:
    | 'invalid_state'
    | 'oauth_token_failed'
    | 'invalid_token_response'
    | 'account_retrieve_failed'
    | 'persistence_failed'
  cause?: unknown
  retryable: false
}>() {
  constructor(args: {
    reason:
      | 'invalid_state'
      | 'oauth_token_failed'
      | 'invalid_token_response'
      | 'account_retrieve_failed'
      | 'persistence_failed'
    cause?: unknown
    message?: string
  }) {
    super({
      reason: args.reason,
      cause: args.cause,
      message: args.message ?? `Stripe OAuth callback failed: ${args.reason}`,
      retryable: false,
    })
  }
}

export type InfrastructureError =
  | DatabaseError
  | DuplicateMessageError
  | QueueError
  | DOUnreachableError
  | WorkflowError
  | EmailServiceError
  | KVError
  | CredentialEncryptionError
  | StripeApiError
  | StripeConnectionUnavailableError
  | StripeOAuthCallbackError

import { DatabaseError } from './database.errors'
