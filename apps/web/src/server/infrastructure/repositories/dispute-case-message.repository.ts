import type {
  DisputeCaseActivity,
  DisputeCaseMessage,
  GetDisputeCaseActivity,
  ListDisputeCaseActivity,
  SaveDisputeCaseMessage,
} from '@riposte/core'
import { DatabaseError } from '@riposte/core'
import type { IDisputeCaseMessageRepository } from '@server/domain/repository/interfaces'
import type { DbDisputeCaseMessage, DrizzleDb } from '@server/infrastructure/db'
import { disputeCaseMessages } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, desc, eq, inArray, min } from 'drizzle-orm'

type SaveInput = Omit<SaveDisputeCaseMessage, 'id' | 'type' | 'name' | 'userId'>
type GetCaseMessagesInput = Omit<GetDisputeCaseActivity, 'type' | 'name' | 'userId'>
type ListCaseActivityInput = Omit<ListDisputeCaseActivity, 'type' | 'name' | 'userId'>

export class DisputeCaseMessageRepository implements IDisputeCaseMessageRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(input: SaveInput): Promise<Result<void, DatabaseError>> {
    const row = {
      id: input.message.id,
      productId: input.productId,
      disputeCaseId: input.disputeCaseId,
      runId: input.runId,
      role: input.message.role,
      parts: input.message.parts,
    }

    return Result.tryPromise({
      try: async () => {
        await this.db
          .insert(disputeCaseMessages)
          .values(row)
          .onConflictDoUpdate({
            target: disputeCaseMessages.id,
            set: { parts: row.parts },
          })
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save dispute case message', cause }),
    })
  }

  async getCaseMessages(
    input: GetCaseMessagesInput,
  ): Promise<Result<DisputeCaseMessage[], DatabaseError>> {
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
        const startedAt = min(disputeCaseMessages.createdAt).as('started_at')
        const caseRows = await this.db
          .select({
            disputeCaseId: disputeCaseMessages.disputeCaseId,
            startedAt,
          })
          .from(disputeCaseMessages)
          .where(eq(disputeCaseMessages.productId, input.productId))
          .groupBy(disputeCaseMessages.disputeCaseId)
          .orderBy(desc(startedAt))
          .limit(input.disputeCaseLimit)

        // Select the N most-recently-started cases, then reverse so the feed
        // reads oldest→newest start (newest run at the bottom, conversation-style).
        // `startedAt` is stable per case, so a block never jumps as it gains steps.
        const activeCaseRows = [...caseRows].toReversed()
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
    role: row.role,
    parts: row.parts,
    createdAt: row.createdAt.toISOString(),
  }
}
