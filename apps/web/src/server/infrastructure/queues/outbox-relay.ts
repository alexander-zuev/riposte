import { createLogger } from '@riposte/core'
import type { DrizzleDb } from '@server/infrastructure/db'
import { OutboxRepository } from '@server/infrastructure/repositories/outbox.repository'

import { QueueClient } from './queue-client'

const logger = createLogger('outbox-relay')

/**
 * OutboxRelay - Reads pending events from DB outbox and relays to Queue
 *
 * Part of the Transactional Outbox Pattern:
 * 1. Command handler saves entity + events in same transaction
 * 2. OutboxRelay reads pending events and publishes to queue
 * 3. Events are marked as processed after successful publish
 *
 * This is the "relay" component - it bridges DB → Queue.
 * Called by OutboxRelayDO (for coalesced processing) and cron (safety net).
 */
export class OutboxRelay {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Flushes pending events from DB outbox to Queue
   *
   * Uses a transaction to hold row locks during the entire operation:
   * SELECT (lock) → SEND → UPDATE → COMMIT (release)
   *
   * Without the transaction, FOR UPDATE SKIP LOCKED would release locks
   * immediately after SELECT, allowing duplicate processing.
   *
   * @param env - Worker environment
   * @param batchSize - Max events to flush (default 50)
   * @returns Number of flushed events
   * @throws Error if flush fails (caller handles retry)
   */
  async flush(env: Env, batchSize = 50): Promise<number> {
    return await this.db.transaction(async (tx: DrizzleDb) => {
      const repo = new OutboxRepository(tx)
      // 1. SELECT: Lock oldest pending events for this transaction
      // SKIP LOCKED ensures concurrent flushes don't block each other
      const pending = await repo.retrievePending(batchSize)
      if (pending.length === 0) {
        return 0
      }

      logger.info('Publishing outbox batch to queue', {
        count: pending.length,
        messages: pending.map((m) => m.payload.name),
      })

      // 2. SEND: Push to queue while holding locks
      // If this fails, transaction rolls back, locks release, retry later
      const queueClient = new QueueClient(env)
      await queueClient.sendBatch(pending.map((row) => row.payload))

      // 3. MARK: Batch update processed status
      // If this fails after SEND, we get at-least-once delivery (acceptable)
      const ids = await repo.publishPending(pending)

      return ids.length
    })
  }
}
