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

export type InfrastructureError = DatabaseError | DuplicateMessageError

import { DatabaseError } from './database.errors'
