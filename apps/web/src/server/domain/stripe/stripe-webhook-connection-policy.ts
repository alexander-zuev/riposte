import type { StripeConnection } from './stripe-connection.types'

export type StripeWebhookConnectionDecision =
  | { action: 'process'; connection: StripeConnection }
  | { action: 'ignore'; reason: 'missing_account' }
  | { action: 'ignore'; reason: 'unknown_account'; account: string }
  | { action: 'ignore'; reason: 'revoked_connection'; connection: StripeConnection }

export function evaluateStripeWebhookConnection(input: {
  account: string | undefined
  connection: StripeConnection | null
}): StripeWebhookConnectionDecision {
  if (!input.account) {
    return { action: 'ignore', reason: 'missing_account' }
  }

  if (!input.connection) {
    return { action: 'ignore', reason: 'unknown_account', account: input.account }
  }

  if (input.connection.status === 'revoked') {
    return { action: 'ignore', reason: 'revoked_connection', connection: input.connection }
  }

  return { action: 'process', connection: input.connection }
}
