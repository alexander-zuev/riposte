import { createLogger } from '@riposte/core'
import { callDo } from '@server/infrastructure/durable-objects/call-do'
import { OUTBOX_RELAY_ID } from '@server/infrastructure/durable-objects/outbox-relay-do'

const logger = createLogger('outbox-relay-wakeup')

export async function wakeOutboxRelay(env: Env): Promise<void> {
  const relayStub = env.OUTBOX_RELAY.get(env.OUTBOX_RELAY.idFromName(OUTBOX_RELAY_ID))
  const result = await callDo(() => relayStub.trigger())
  if (result.isErr()) logger.error('Failed to trigger outbox relay', { error: result.error })
}
