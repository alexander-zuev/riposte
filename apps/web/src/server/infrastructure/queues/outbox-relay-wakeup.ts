import { createLogger, type DOUnreachableError } from '@riposte/core'
import {
  DurableObjectRpc,
  type IDurableObjectRpc,
} from '@server/infrastructure/durable-objects/durable-object-rpc'
import { OUTBOX_RELAY_ID } from '@server/infrastructure/durable-objects/outbox-relay-id'
import type { Result } from 'better-result'

const logger = createLogger('outbox-relay-wakeup')

export async function triggerOutboxRelay(
  env: Env,
  rpc: IDurableObjectRpc = new DurableObjectRpc(),
): Promise<Result<void, DOUnreachableError>> {
  const relayStub = env.OUTBOX_RELAY.get(env.OUTBOX_RELAY.idFromName(OUTBOX_RELAY_ID))
  return rpc.call(() => relayStub.trigger())
}

export async function wakeOutboxRelay(env: Env): Promise<void> {
  const result = await triggerOutboxRelay(env)
  if (result.isErr()) logger.error('Failed to trigger outbox relay', { error: result.error })
}
