import type {
  AppendDisputeCaseMessages,
  DisputeCaseActivity,
  DisputeCaseMessage,
  ListDisputeCaseActivity,
  ListDisputeCaseMessages,
} from '@riposte/core'
import { DatabaseError, uuidv7 } from '@riposte/core'
import type { IDisputeCaseMessageRepository } from '@server/domain/repository/interfaces'
import type { DbDisputeCaseMessage, DrizzleDb } from '@server/infrastructure/db'
import { disputeCaseMessages } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, desc, eq, inArray, max } from 'drizzle-orm'

type AppendInput = Omit<AppendDisputeCaseMessages, 'id' | 'type' | 'name' | 'userId'>
type ListInput = Omit<ListDisputeCaseMessages, 'type' | 'name' | 'userId'>
type ListCaseActivityInput = Omit<ListDisputeCaseActivity, 'type' | 'name' | 'userId'>

export class DisputeCaseMessageRepository implements IDisputeCaseMessageRepository {
  constructor(private readonly db: DrizzleDb) {}

  async appendBatch(input: AppendInput): Promise<Result<void, DatabaseError>> {
    const rows = input.messages.map((m) => ({
      id: uuidv7(),
      productId: input.productId,
      disputeCaseId: input.disputeCaseId,
      runId: input.runId,
      messageId: m.id,
      role: m.role,
      parts: m.parts,
    }))

    return Result.tryPromise({
      try: async () => {
        await this.db
          .insert(disputeCaseMessages)
          .values(rows)
          .onConflictDoNothing({
            target: [disputeCaseMessages.disputeCaseId, disputeCaseMessages.messageId],
          })
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to append dispute case messages', cause }),
    })
  }

  async listMessages(input: ListInput): Promise<Result<DisputeCaseMessage[], DatabaseError>> {
    return Result.tryPromise({
      try: async () => {
        const rows = await this.db
          .select()
          .from(disputeCaseMessages)
          .where(
            and(
              eq(disputeCaseMessages.productId, input.productId),
              eq(disputeCaseMessages.disputeCaseId, input.disputeCaseId),
            ),
          )
          .orderBy(asc(disputeCaseMessages.createdAt), asc(disputeCaseMessages.id))
          .limit(input.limit)

        return rows.map(toDisputeCaseMessage)
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to list dispute case messages', cause }),
    })
  }

  async listCaseActivity(
    input: ListCaseActivityInput,
  ): Promise<Result<DisputeCaseActivity[], DatabaseError>> {
    return Result.tryPromise({
      try: async () => {
        const latestMessageCreatedAt = max(disputeCaseMessages.createdAt).as(
          'latest_message_created_at',
        )
        const caseRows = await this.db
          .select({
            disputeCaseId: disputeCaseMessages.disputeCaseId,
            latestMessageCreatedAt,
          })
          .from(disputeCaseMessages)
          .where(eq(disputeCaseMessages.productId, input.productId))
          .groupBy(disputeCaseMessages.disputeCaseId)
          .orderBy(desc(latestMessageCreatedAt))
          .limit(input.disputeCaseLimit)

        const activeCaseRows = caseRows.filter(hasLatestMessageCreatedAt)
        const disputeCaseIds = activeCaseRows.map((row) => row.disputeCaseId)
        if (disputeCaseIds.length === 0) return []

        const rows = await this.db
          .select()
          .from(disputeCaseMessages)
          .where(
            and(
              eq(disputeCaseMessages.productId, input.productId),
              inArray(disputeCaseMessages.disputeCaseId, disputeCaseIds),
            ),
          )
          .orderBy(asc(disputeCaseMessages.createdAt), asc(disputeCaseMessages.id))

        const messagesByCase = new Map<string, DisputeCaseMessage[]>()
        for (const row of rows) {
          const message = toDisputeCaseMessage(row)
          const messages = messagesByCase.get(message.disputeCaseId)
          if (messages) {
            messages.push(message)
          } else {
            messagesByCase.set(message.disputeCaseId, [message])
          }
        }

        return activeCaseRows.map((row) => ({
          disputeCaseId: row.disputeCaseId,
          latestMessageCreatedAt: toIsoString(row.latestMessageCreatedAt),
          messages: messagesByCase.get(row.disputeCaseId) ?? [],
        }))
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to list dispute case activity', cause }),
    })
  }
}

function toDisputeCaseMessage(row: DbDisputeCaseMessage): DisputeCaseMessage {
  return {
    id: row.id,
    productId: row.productId,
    disputeCaseId: row.disputeCaseId,
    runId: row.runId,
    messageId: row.messageId,
    role: row.role,
    parts: row.parts,
    createdAt: row.createdAt.toISOString(),
  }
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function hasLatestMessageCreatedAt<T extends { latestMessageCreatedAt: Date | null }>(
  row: T,
): row is T & { latestMessageCreatedAt: Date } {
  return row.latestMessageCreatedAt !== null
}
