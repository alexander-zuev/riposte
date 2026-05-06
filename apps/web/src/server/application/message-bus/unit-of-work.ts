import type { DatabaseError, DuplicateMessageError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { AppDeps } from '@server/infrastructure/app-deps'
import {
  getCollectedEvents,
  runWithEventContext,
} from '@server/infrastructure/context/event-context'
import type { DrizzleDb } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { is, TransactionRollbackError } from 'drizzle-orm'

const logger = createLogger('unit-of-work')

/**
 * Unit of Work - Result ↔ throw bridge for Drizzle transactions
 *
 * Handlers return Result<T, E>. Drizzle only rolls back on throw.
 * Bridge: on Result.err(), store error + call tx.rollback() (throws),
 * catch block converts back to Result.err().
 *
 * Repository failures also return Result.err(); UoW turns them into rollback,
 * then converts the rollback back into Result.err().
 */
export async function executeUoW<T, E>(
  deps: AppDeps,
  work: (tx: DrizzleDb) => Promise<Result<T, E>>,
  msgId: string,
): Promise<Result<T, E | DatabaseError | DuplicateMessageError>> {
  const db = deps.db()
  let rollbackErr: E | DatabaseError | DuplicateMessageError | undefined
  let eventsPersisted = false

  try {
    const value = await runWithEventContext(async () =>
      db.transaction(async (tx) => {
        const outboxRepo = deps.repos.outbox(tx)

        const receipt = await outboxRepo.assertMessageNotProcessed(msgId)
        if (receipt.isErr()) {
          rollbackErr = receipt.error
          tx.rollback()
        }

        const result = await work(tx)

        if (result.isErr()) {
          rollbackErr = result.error
          tx.rollback()
        }

        const events = getCollectedEvents()
        if (events.length > 0) {
          logger.debug('persisting_events', {
            count: events.length,
            names: events.map((e) => e.name),
          })

          const persisted = await outboxRepo.persistEvents(events)
          if (persisted.isErr()) {
            rollbackErr = persisted.error
            tx.rollback()
          }
          eventsPersisted = true
        }

        return result.unwrap()
      }),
    )

    if (eventsPersisted) deps.hooks.onEventsCommitted()
    return Result.ok(value)
  } catch (error) {
    if (is(error, TransactionRollbackError) && rollbackErr !== undefined) {
      return Result.err(rollbackErr)
    }
    throw error
  }
}
