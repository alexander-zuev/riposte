import { DatabaseError, type DisputeSyncState } from '@riposte/core'
import type {
  IStripeDisputeSyncStateRepository,
  StripeDisputeSyncAccount,
} from '@server/domain/repository/interfaces'
import type { DrizzleDb } from '@server/infrastructure/db'
import { stripeConnections, stripeDisputeSyncState } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, desc, eq, isNull, lt, or } from 'drizzle-orm'

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

  async findForAccount(input: {
    stripeAccountId: string
    livemode: boolean
  }): Promise<Result<DisputeSyncState, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [state] = await this.db
          .select({ lastSyncedAt: stripeDisputeSyncState.lastSyncedAt })
          .from(stripeDisputeSyncState)
          .where(
            and(
              eq(stripeDisputeSyncState.stripeAccountId, input.stripeAccountId),
              eq(stripeDisputeSyncState.livemode, input.livemode),
            ),
          )
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

  async findDueAccounts(input: {
    dueBefore: Date
    limit: number
  }): Promise<Result<StripeDisputeSyncAccount[], DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        return await this.db
          .select({
            userId: stripeConnections.userId,
            stripeAccountId: stripeConnections.stripeAccountId,
            livemode: stripeConnections.livemode,
          })
          .from(stripeConnections)
          .leftJoin(
            stripeDisputeSyncState,
            and(
              eq(stripeDisputeSyncState.stripeAccountId, stripeConnections.stripeAccountId),
              eq(stripeDisputeSyncState.livemode, stripeConnections.livemode),
            ),
          )
          .where(
            and(
              eq(stripeConnections.status, 'active'),
              or(
                isNull(stripeDisputeSyncState.lastSyncedAt),
                lt(stripeDisputeSyncState.lastSyncedAt, input.dueBefore),
              ),
            ),
          )
          .orderBy(asc(stripeConnections.connectedAt))
          .limit(input.limit)
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe dispute sync due accounts', cause }),
    })

    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value)
  }
}
