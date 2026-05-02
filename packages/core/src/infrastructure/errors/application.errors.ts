import { ApplicationError } from './base.errors'

export class UnknownMessageTypeError extends ApplicationError {
  override retryable: boolean = false

  constructor(messageType: unknown) {
    super('Unknown message type', { messageType })
  }
}

export class NoHandlerError extends ApplicationError {
  override retryable: boolean = false

  constructor(
    public readonly kind: 'command' | 'query',
    public readonly messageName: string,
  ) {
    super(`No handler for ${kind}: ${messageName}`, { kind, messageName })
  }
}
