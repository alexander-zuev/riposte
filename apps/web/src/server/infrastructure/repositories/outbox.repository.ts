import type { DomainEvent, UUIDv4 } from '@riposte/core'
import { DatabaseError, DuplicateMessageError } from '@riposte/core'
import type { IOutboxRepository } from '@server/domain/repository/interfaces'
import type { DbOutbox, DrizzleDb } from '@server/infrastructure/db'
import { messageOutbox, messageReceipts } from '@server/infrastructure/db'
import { BaseRepository } from '@server/infrastructure/repositories/base.repository'
import { asc, inArray, isNull } from 'drizzle-orm'

export class OutboxRepository extends BaseRepository implements IOutboxRepository {
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async persistEvents(events: DomainEvent[]): Promise<void> {
    try {
      if (events.length === 0) return
      await this.db.insert(messageOutbox).values(events.map((e) => ({ id: e.id, payload: e })))
    } catch (e) {
      throw new DatabaseError({ message: 'Failed to persist events', cause: e })
    }
  }

  async assertMessageNotProcessed(msgId: UUIDv4): Promise<void> {
    let inserted
    try {
      inserted = await this.db
        .insert(messageReceipts)
        .values({ messageId: msgId })
        .onConflictDoNothing()
        .returning({ id: messageReceipts.messageId })
    } catch (e) {
      throw new DatabaseError({ message: `Failed to insert message receipt ${msgId}`, cause: e })
    }
    if (inserted.length === 0) {
      throw new DuplicateMessageError({ messageId: msgId })
    }
  }

  async publishPending(pending: DbOutbox[]): Promise<UUIDv4[]> {
    try {
      const ids = pending.map((p) => p.id)
      await this.db
        .update(messageOutbox)
        .set({ publishedAt: new Date() })
        .where(inArray(messageOutbox.id, ids))
      return ids
    } catch (e) {
      throw new DatabaseError({ message: 'Failed to mark outbox messages published', cause: e })
    }
  }

  async retrievePending(batchSize: number): Promise<DbOutbox[]> {
    try {
      const pending = await this.db
        .select()
        .from(messageOutbox)
        .where(isNull(messageOutbox.publishedAt))
        .orderBy(asc(messageOutbox.createdAt))
        .limit(batchSize)
        .for('update', { skipLocked: true })
      return pending
    } catch (e) {
      throw new DatabaseError({ message: 'Failed to retrieve pending outbox messages', cause: e })
    }
  }
}
