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
  retryable: true
}>() {
  constructor(args: { message: string; cause: unknown }) {
    // Cloudflare Queue producer errors do not expose a stable retry taxonomy.
    // Treat as retryable for outer relay retry; validate with production telemetry.
    super({ message: args.message, cause: args.cause, retryable: true })
  }
}

export type InfrastructureError = DatabaseError | DuplicateMessageError | QueueError

import { DatabaseError } from './database.errors'
