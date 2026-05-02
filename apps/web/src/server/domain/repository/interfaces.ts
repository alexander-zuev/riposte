import type { DomainEvent, UUIDv4 } from '@riposte/core'
import type { DbOutbox } from '@server/infrastructure/db'

/* -------------------------------------------------------------------------------------------------
 * Outbox Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IOutboxRepository {
  persistEvents: (events: DomainEvent[]) => Promise<void>
  /** Check if message was already processed. Throws DuplicateMessageError if yes. */
  assertMessageNotProcessed: (msgId: UUIDv4) => Promise<void>
  /** Retrieve pending outbox messages (unpublished, ordered by createdAt). */
  retrievePending: (batchSize: number) => Promise<DbOutbox[]>
  /** Mark messages as published. Returns published IDs. */
  publishPending: (pending: DbOutbox[]) => Promise<UUIDv4[]>
}
