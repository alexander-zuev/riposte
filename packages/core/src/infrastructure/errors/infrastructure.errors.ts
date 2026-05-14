import { TaggedError } from 'better-result'

import type { BlobStorageError } from './bucket.errors'
import type { DatabaseError } from './database.errors'

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

export class ImageFetchFailedError extends TaggedError('ImageFetchFailedError')<{
  message: string
  cause?: unknown
  status?: number
  retryable: true
}>() {
  constructor(args: { cause?: unknown; status?: number } = {}) {
    super({
      ...args,
      message: 'Failed to load image',
      retryable: true,
    })
  }
}

export class UnsupportedImageTypeError extends TaggedError('UnsupportedImageTypeError')<{
  contentType: string
  message: string
  retryable: false
}>() {
  constructor(args: { contentType: string }) {
    super({
      contentType: args.contentType,
      message: 'Invalid image format',
      retryable: false,
    })
  }
}

export class ImageTooLargeError extends TaggedError('ImageTooLargeError')<{
  actualBytes?: number
  maxBytes: number
  message: string
  retryable: false
}>() {
  constructor(args: { actualBytes?: number; maxBytes: number }) {
    super({
      actualBytes: args.actualBytes,
      maxBytes: args.maxBytes,
      message: 'Image too large',
      retryable: false,
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

export class SlackApiError extends TaggedError('SlackApiError')<{
  message: string
  operation: string
  cause: unknown
  retryable: boolean
  slackErrorCode?: string
  status?: number
}>() {
  constructor(args: {
    operation: string
    cause: unknown
    retryable: boolean
    message?: string
    slackErrorCode?: string
    status?: number
  }) {
    super({
      message: args.message ?? getErrorMessage(args.cause) ?? `Slack ${args.operation} failed`,
      operation: args.operation,
      cause: args.cause,
      retryable: args.retryable,
      slackErrorCode: args.slackErrorCode,
      status: args.status,
    })
  }
}

function getErrorMessage(cause: unknown): string | undefined {
  if (cause instanceof Error) return cause.message
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'message' in cause &&
    typeof cause.message === 'string'
  ) {
    return cause.message
  }
  return undefined
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

export class SlackOAuthCallbackError extends TaggedError('SlackOAuthCallbackError')<{
  message: string
  reason:
    | 'invalid_state'
    | 'oauth_token_failed'
    | 'invalid_token_response'
    | 'missing_incoming_webhook'
    | 'persistence_failed'
  cause?: unknown
  retryable: false
}>() {
  constructor(args: {
    reason:
      | 'invalid_state'
      | 'oauth_token_failed'
      | 'invalid_token_response'
      | 'missing_incoming_webhook'
      | 'persistence_failed'
    cause?: unknown
    message?: string
  }) {
    super({
      reason: args.reason,
      cause: args.cause,
      message: args.message ?? `Slack OAuth callback failed: ${args.reason}`,
      retryable: false,
    })
  }
}

export class SlackWebhookError extends TaggedError('SlackWebhookError')<{
  message: string
  operation: 'send' | 'signature_verification'
  cause?: unknown
  status?: number
  retryable: boolean
}>() {
  constructor(args: {
    operation: 'send' | 'signature_verification'
    cause?: unknown
    status?: number
    retryable?: boolean
    message?: string
  }) {
    super({
      operation: args.operation,
      cause: args.cause,
      status: args.status,
      message: args.message ?? `Slack webhook ${args.operation} failed`,
      retryable: args.retryable ?? args.operation === 'send',
    })
  }
}

export type EvidencePdfRenderFailureReason =
  | 'invalid_document'
  | 'page_limit_exceeded'
  | 'byte_limit_exceeded'
  | 'render_failed'

export type EvidencePdfRenderIssue = {
  path: string
  message: string
}

export class EvidencePdfRenderError extends TaggedError('EvidencePdfRenderError')<{
  message: string
  reason: EvidencePdfRenderFailureReason
  issues?: EvidencePdfRenderIssue[]
  actual?: number
  limit?: number
  cause?: unknown
  retryable: false
}>() {
  constructor(args: {
    reason: EvidencePdfRenderFailureReason
    issues?: EvidencePdfRenderIssue[]
    actual?: number
    limit?: number
    cause?: unknown
    message?: string
  }) {
    super({
      reason: args.reason,
      issues: args.issues,
      actual: args.actual,
      limit: args.limit,
      cause: args.cause,
      message: args.message ?? evidencePdfRenderErrorMessage(args),
      retryable: false,
    })
  }
}

function evidencePdfRenderErrorMessage(args: {
  reason: EvidencePdfRenderFailureReason
  actual?: number
  limit?: number
}): string {
  switch (args.reason) {
    case 'invalid_document':
      return 'Evidence PDF document is invalid'
    case 'page_limit_exceeded':
      return `Evidence PDF exceeds page limit: ${args.actual ?? 'unknown'} > ${args.limit ?? 'unknown'}`
    case 'byte_limit_exceeded':
      return `Evidence PDF exceeds byte limit: ${args.actual ?? 'unknown'} > ${args.limit ?? 'unknown'}`
    case 'render_failed':
      return 'Evidence PDF render failed'
    default:
      args.reason satisfies never
      return 'Evidence PDF render failed'
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
  | ImageFetchFailedError
  | UnsupportedImageTypeError
  | ImageTooLargeError
  | CredentialEncryptionError
  | StripeApiError
  | StripeConnectionUnavailableError
  | StripeOAuthCallbackError
  | EvidencePdfRenderError
  | BlobStorageError
