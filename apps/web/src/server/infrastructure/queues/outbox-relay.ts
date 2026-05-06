import type { DatabaseError, QueueError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { IOutboxRepository } from '@server/domain/repository/interfaces'
import type { DrizzleDb } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { is, TransactionRollbackError } from 'drizzle-orm'

import type { IQueueClient } from './queue-client'

const logger = createLogger('outbox-relay')

type OutboxRelayError = DatabaseError | QueueError

export interface IOutboxRelay {
  flush: (batchSize?: number) => Promise<Result<number, OutboxRelayError>>
}

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
export class OutboxRelay implements IOutboxRelay {
  constructor(
    private readonly db: DrizzleDb,
    private readonly queueClient: IQueueClient,
    private readonly outboxRepo: (tx: DrizzleDb) => IOutboxRepository,
  ) {}

  /**
   * Flushes pending events from DB outbox to Queue
   *
   * Uses a transaction to hold row locks during the entire operation:
   * SELECT (lock) → SEND → UPDATE → COMMIT (release)
   *
   * Without the transaction, FOR UPDATE SKIP LOCKED would release locks
   * immediately after SELECT, allowing duplicate processing.
   *
   * @param batchSize - Max events to flush (default 50)
   * @returns Number of flushed events, or a typed infrastructure error.
   */
  async flush(batchSize = 50): Promise<Result<number, OutboxRelayError>> {
    let rollbackErr: OutboxRelayError | undefined

    try {
      const published = await this.db.transaction(async (tx) => {
        const repo = this.outboxRepo(tx)
        // 1. SELECT: Lock oldest pending events for this transaction
        // SKIP LOCKED ensures concurrent flushes don't block each other
        const pendingResult = await repo.retrievePending(batchSize)
        if (pendingResult.isErr()) {
          rollbackErr = pendingResult.error
          return tx.rollback()
        }

        const pending = pendingResult.unwrap()
        if (pending.length === 0) {
          return 0
        }

        logger.info('Publishing outbox batch to queue', {
          count: pending.length,
          messages: pending.map((m) => m.payload.name),
        })

        // 2. SEND: Push to queue while holding locks
        // If this fails, transaction rolls back, locks release, retry later
        const sent = await this.queueClient.sendBatch(pending.map((row) => row.payload))
        if (sent.isErr()) {
          rollbackErr = sent.error
          return tx.rollback()
        }

        // 3. MARK: Batch update processed status
        // If this fails after SEND, we get at-least-once delivery (acceptable)
        const idsResult = await repo.publishPending(pending)
        if (idsResult.isErr()) {
          rollbackErr = idsResult.error
          return tx.rollback()
        }

        return idsResult.unwrap().length
      })

      return Result.ok(published)
    } catch (error) {
      if (is(error, TransactionRollbackError) && rollbackErr !== undefined) {
        return Result.err(rollbackErr)
      }

      throw error
    }
  }
}
