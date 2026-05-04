import type { DomainEvent, UUIDv4 } from '@riposte/core'
import { DatabaseError, DuplicateMessageError } from '@riposte/core'
import type { IOutboxRepository } from '@server/domain/repository/interfaces'
import type { DbOutbox, DrizzleDb } from '@server/infrastructure/db'
import { messageOutbox, messageReceipts } from '@server/infrastructure/db'
import { BaseRepository } from '@server/infrastructure/repositories/base.repository'
import { Result } from 'better-result'
import { asc, inArray, isNull } from 'drizzle-orm'

export class OutboxRepository extends BaseRepository implements IOutboxRepository {
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async persistEvents(events: DomainEvent[]): Promise<Result<void, DatabaseError>> {
    if (events.length === 0) return Result.ok()
    return Result.tryPromise({
      try: async () => {
        await this.db.insert(messageOutbox).values(events.map((e) => ({ id: e.id, payload: e })))
      },
      catch: (e) => new DatabaseError({ message: 'Failed to persist events', cause: e }),
    })
  }

  async assertMessageNotProcessed(
    msgId: string,
  ): Promise<Result<void, DatabaseError | DuplicateMessageError>> {
    const inserted = await Result.tryPromise({
      try: () =>
        this.db
          .insert(messageReceipts)
          .values({ messageId: msgId })
          .onConflictDoNothing()
          .returning({ id: messageReceipts.messageId }),
      catch: (e) =>
        new DatabaseError({ message: `Failed to insert message receipt ${msgId}`, cause: e }),
    })
    if (inserted.isErr()) return inserted
    if (inserted.value.length === 0)
      return Result.err(new DuplicateMessageError({ messageId: msgId }))
    return Result.ok()
  }

  async publishPending(pending: DbOutbox[]): Promise<Result<UUIDv4[], DatabaseError>> {
    const ids = pending.map((p) => p.id)
    return Result.tryPromise({
      try: async () => {
        await this.db
          .update(messageOutbox)
          .set({ publishedAt: new Date() })
          .where(inArray(messageOutbox.id, ids))
        return ids
      },
      catch: (e) => new DatabaseError({ message: 'Failed to mark outbox messages published', cause: e }),
    })
  }

  async retrievePending(batchSize: number): Promise<Result<DbOutbox[], DatabaseError>> {
    return Result.tryPromise({
      try: () =>
        this.db
          .select()
          .from(messageOutbox)
          .where(isNull(messageOutbox.publishedAt))
          .orderBy(asc(messageOutbox.createdAt))
          .limit(batchSize)
          .for('update', { skipLocked: true }),
      catch: (e) => new DatabaseError({ message: 'Failed to retrieve pending outbox messages', cause: e }),
    })
  }
}
