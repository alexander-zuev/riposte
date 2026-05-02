import type { UUIDv4 } from '@riposte/core'
import { createLogger } from '@riposte/core'
import {
  getCollectedEvents,
  runWithEventContext,
} from '@server/infrastructure/context/event-context'
import type { DrizzleDb } from '@server/infrastructure/db'
import { createDatabase } from '@server/infrastructure/db'
import { OUTBOX_RELAY_ID } from '@server/infrastructure/durable-objects/outbox-relay-do'
import { OutboxRepository } from '@server/infrastructure/repositories/outbox.repository'

const logger = createLogger('unit-of-work')

/**
 * Unit of Work - Wraps operation in a transaction, ensures idempotency, flushes events
 *
 * Pattern:
 * 1. Execute work inside event context + DB transaction
 * 2. Repos register events via registerEvents()
 * 3. UoW persists collected events to outbox (same tx)
 * 4. After commit, trigger DO relay to flush outbox (coalesced)
 *
 * Atomicity: either both entity AND events persist, or neither.
 */
export async function executeUoW<T>(
  env: Env,
  ctx: Pick<ExecutionContext, 'waitUntil'>,
  work: (tx: DrizzleDb) => Promise<T>,
  msgId?: UUIDv4, // optional for work done outside of message bus (cf workflows)
): Promise<T> {
  const db = createDatabase(env)

  // Event context + transaction
  const result = await runWithEventContext(() =>
    db.transaction(async (tx: DrizzleDb) => {
      const outboxRepo = new OutboxRepository(tx)

      // Idempotency check
      if (msgId) {
        await outboxRepo.assertMessageNotProcessed(msgId)
      }

      // Execute work
      const workResult = await work(tx)

      // Persist collected events
      const events = getCollectedEvents()
      if (events.length > 0) {
        logger.debug('persisting_events', {
          count: events.length,
          names: events.map((e) => e.name),
        })
        await outboxRepo.persistEvents(events)
      }

      return workResult
    }),
  )

  // Trigger publishing events to message queue from Outbox
  // Wrapped in async IIFE so synchronous DO stub errors (e.g. miniflare
  // invalidation) are caught — plain .catch() only handles async rejections.
  ctx.waitUntil(
    (async () => {
      try {
        await env.OUTBOX_RELAY.get(env.OUTBOX_RELAY.idFromName(OUTBOX_RELAY_ID)).trigger()
      } catch (error: unknown) {
        // Don't throw - relay failure shouldn't fail the request
        // Cron is the safety net for missed events
        logger.error('Failed to trigger outbox relay', { error })
      }
    })(),
  )
  return result
}
