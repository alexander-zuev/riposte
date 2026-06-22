import type { DatabaseError, QueueError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { IOutboxRelayStore } from '@server/domain/repository/interfaces'
import type { DbOutbox, DrizzleDb, Tx } from '@server/infrastructure/db'
import { brandTx } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { is, TransactionRollbackError } from 'drizzle-orm'

import type { IQueueClient } from './queue-client'

const logger = createLogger('outbox-relay')

type OutboxRelayError = DatabaseError | QueueError

/**
 * Give up retrying a batch after this many attempts; dead-letter instead. Mirrors the
 * consumer's platform ceiling (`max_retries: 5` in wrangler.jsonc) so a message gets the
 * same number of tries on the producer side as on the consumer side.
 */
const MAX_ATTEMPTS = 5
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 60_000

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
 * Called by OutboxRelayDO (coalesced) and cron (safety net).
 */
export class OutboxRelay implements IOutboxRelay {
  // Machinery exemption: holds the writable root handle by design — the relay opens its
  // own transaction outside any UoW (idempotent bookkeeping, no claim, no domain events).
  constructor(
    private readonly db: DrizzleDb,
    private readonly queueClient: IQueueClient,
    private readonly outboxRepo: (tx: Tx) => IOutboxRelayStore,
  ) {}

  /**
   * Flushes pending events from DB outbox to Queue, holding row locks for the whole
   * SELECT (FOR UPDATE SKIP LOCKED) → SEND → WRITE → COMMIT so concurrent relays never
   * double-process. Forward progress is partial by design: oversized poison is
   * dead-lettered and the rest published in the same commit, so one bad message can
   * never block the head or trigger an infinite retry.
   *
   * Returns the number published, or an `Err` ONLY when a DB op fails (tx rolls back).
   * Queue send failures are absorbed (deferred with backoff, or dead-lettered) — they
   * never surface as `Err`, so the DO alarm can't storm on them.
   *
   * @param batchSize - Max events to flush (default 50)
   */
  async flush(batchSize = 50): Promise<Result<number, OutboxRelayError>> {
    let rollbackErr: OutboxRelayError | undefined

    try {
      const published = await this.db.transaction(async (rawTx) => {
        const tx = brandTx(rawTx)
        const repo = this.outboxRepo(tx)

        // 1. SELECT: lock the oldest available pending rows for this transaction.
        const pendingResult = await repo.retrievePending(batchSize)
        if (pendingResult.isErr()) {
          rollbackErr = pendingResult.error
          return tx.rollback()
        }

        const pending = pendingResult.unwrap()
        if (pending.length === 0) return 0

        logger.info('publishing_outbox_batch', {
          count: pending.length,
          messages: pending.map((row) => row.payload.name),
        })

        // 2. SEND: push to queue while holding locks (oversized are refused pre-flight).
        const sent = await this.queueClient.sendBatch(pending.map((row) => row.payload))
        if (sent.isErr()) {
          // Whole batch failed to send. Back off or dead-letter so the head always
          // advances — never an infinite retry of the same batch.
          const disposed = await this.handleSendFailure(repo, pending, sent.error)
          if (disposed.isErr()) {
            rollbackErr = disposed.error
            return tx.rollback()
          }
          return 0
        }

        // 3a. DEAD-LETTER: oversized messages can never be sent on any queue. The full
        // payload stays on the row for inspection / manual replay. sendBatch returns the
        // same payload object references it refused, so we match by identity.
        const rejected = new Set(sent.unwrap())
        const oversized = pending.filter((row) => rejected.has(row.payload))
        const publishable = pending.filter((row) => !rejected.has(row.payload))

        if (oversized.length > 0) {
          const dead = await repo.deadLetter(
            oversized,
            'oversized: exceeds queue message size limit',
          )
          if (dead.isErr()) {
            rollbackErr = dead.error
            return tx.rollback()
          }
          logger.error('outbox_messages_dead_lettered', {
            count: oversized.length,
            reason: 'oversized',
          })
        }

        // 3b. PUBLISH: mark everything that was sent.
        const publishedResult = await repo.publishPending(publishable)
        if (publishedResult.isErr()) {
          rollbackErr = publishedResult.error
          return tx.rollback()
        }

        return publishedResult.unwrap().length
      })

      return Result.ok(published)
    } catch (error) {
      if (is(error, TransactionRollbackError) && rollbackErr !== undefined) {
        return Result.err(rollbackErr)
      }
      throw error
    }
  }

  /**
   * A whole-batch send failure. Transient and within the attempt budget → defer with
   * exponential backoff (re-driven by the next commit's `waitUntil` or the cron).
   * Permanent, or budget exhausted → dead-letter so the head advances. Both commit;
   * only a DB write failure returns an `Err` (rolls the tx back).
   */
  private async handleSendFailure(
    repo: IOutboxRelayStore,
    pending: DbOutbox[],
    error: QueueError,
  ): Promise<Result<void, DatabaseError>> {
    const attempts = Math.max(...pending.map((row) => row.attempts))
    const retryable = error.retryable && attempts < MAX_ATTEMPTS

    if (retryable) {
      logger.warn('outbox_relay_send_retry', { attempts, error })
      return repo.deferRetry(pending, outboxBackoffMs(attempts))
    }

    const reason = error.retryable
      ? `max attempts (${MAX_ATTEMPTS}) exhausted`
      : 'permanent send failure'
    logger.error('outbox_relay_send_dead_letter', { attempts, retryable: error.retryable, error })
    return repo.deadLetter(pending, reason)
  }
}

function outboxBackoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1)
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** exponent, RETRY_MAX_DELAY_MS)
}
