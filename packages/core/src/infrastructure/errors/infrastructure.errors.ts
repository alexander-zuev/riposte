import { InfrastructureError } from './base.errors'

export class DuplicateMessageError extends InfrastructureError {
  constructor(public readonly messageId: string) {
    super(`Duplicate message: ${messageId}`)
  }
}
