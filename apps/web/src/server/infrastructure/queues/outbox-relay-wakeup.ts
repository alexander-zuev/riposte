import { createLogger, type DOUnreachableError } from '@riposte/core'
import { callDo } from '@server/infrastructure/durable-objects/call-do'
import { OUTBOX_RELAY_ID } from '@server/infrastructure/durable-objects/outbox-relay-do'
import type { Result } from 'better-result'

const logger = createLogger('outbox-relay-wakeup')

export async function triggerOutboxRelay(env: Env): Promise<Result<void, DOUnreachableError>> {
  const relayStub = env.OUTBOX_RELAY.get(env.OUTBOX_RELAY.idFromName(OUTBOX_RELAY_ID))
  return callDo(() => relayStub.trigger())
}

export async function wakeOutboxRelay(env: Env): Promise<void> {
  const result = await triggerOutboxRelay(env)
  if (result.isErr()) logger.error('Failed to trigger outbox relay', { error: result.error })
}
