import { DatabaseError } from '@riposte/core'
import { StripeDisputeContext } from '@server/domain/disputes'
import type { IStripeDisputeContextRepository } from '@server/domain/repository/interfaces'
import type { DbNewStripeDisputeContext, DrizzleDb } from '@server/infrastructure/db'
import { stripeDisputeContexts } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { eq } from 'drizzle-orm'

export class StripeDisputeContextRepository implements IStripeDisputeContextRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByDisputeCaseId(
    disputeCaseId: string,
  ): Promise<Result<StripeDisputeContext | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select()
          .from(stripeDisputeContexts)
          .where(eq(stripeDisputeContexts.disputeCaseId, disputeCaseId))

        return row ? StripeDisputeContext.deserialize(row) : null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe dispute context', cause }),
    })

    return found
  }

  async save(context: StripeDisputeContext): Promise<Result<StripeDisputeContext, DatabaseError>> {
    const row = context.serialize() satisfies DbNewStripeDisputeContext

    const saved = await Result.tryPromise({
      try: async () => {
        const [contextRow] = await this.db
          .insert(stripeDisputeContexts)
          .values(row)
          .onConflictDoUpdate({
            target: stripeDisputeContexts.disputeCaseId,
            set: {
              charge: row.charge,
              customer: row.customer,
              card: row.card,
              risk: row.risk,
              invoice: row.invoice,
              subscription: row.subscription,
              refunds: row.refunds,
              paymentHistory: row.paymentHistory,
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!contextRow) throw new Error('Stripe dispute context save returned no row')
        return StripeDisputeContext.deserialize(contextRow)
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save Stripe dispute context', cause }),
    })

    return saved
  }
}
