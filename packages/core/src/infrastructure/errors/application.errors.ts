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

export class NoHandlerError extends TaggedError('NoHandlerError')<{
  kind: string
  messageName: string
  message: string
  retryable: false
}>() {
  constructor(args: { kind: string; messageName: string }) {
    super({
      ...args,
      message: `No handler for ${args.kind}: ${args.messageName}`,
      retryable: false,
    })
  }
}

export type ApplicationError = UnknownMessageTypeError | NoHandlerError
