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

export type InfrastructureError =
  | DatabaseError
  | DuplicateMessageError
  | QueueError
  | DOUnreachableError
  | EmailServiceError
  | KVError

import { DatabaseError } from './database.errors'
