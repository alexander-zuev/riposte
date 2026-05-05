import { TaggedError } from 'better-result'

export class UnknownMessageTypeError extends TaggedError('UnknownMessageTypeError')<{
  message: string
  retryable: false
}>() {
  constructor(args: { messageType: string }) {
    super({
      message: `Unknown message type: ${args.messageType}`,
      retryable: false,
    })
  }
}

export class InternalServerError extends TaggedError('InternalServerError')<{
  message: string
  retryable: false
}>() {
  constructor(args?: { message?: string }) {
    super({
      message: args?.message ?? 'Something went wrong',
      retryable: false,
    })
  }
}

export type ApplicationError = UnknownMessageTypeError | InternalServerError
