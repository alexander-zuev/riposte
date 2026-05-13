import { DatabaseError, type DisputeSyncState } from '@riposte/core'
import type { IStripeDisputeSyncStateRepository } from '@server/domain/repository/interfaces'
import type { DrizzleDb } from '@server/infrastructure/db'
import { stripeDisputeSyncState } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { desc, eq } from 'drizzle-orm'

export class StripeDisputeSyncStateRepository implements IStripeDisputeSyncStateRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findForUser(userId: string): Promise<Result<DisputeSyncState, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [state] = await this.db
          .select({ lastSyncedAt: stripeDisputeSyncState.lastSyncedAt })
          .from(stripeDisputeSyncState)
          .where(eq(stripeDisputeSyncState.userId, userId))
          .orderBy(desc(stripeDisputeSyncState.lastSyncedAt))
          .limit(1)

        return state ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe dispute sync state', cause }),
    })

    if (found.isErr()) return Result.err(found.error)

    return Result.ok({
      lastSyncedAt: found.value?.lastSyncedAt?.toISOString() ?? null,
    })
  }
}
