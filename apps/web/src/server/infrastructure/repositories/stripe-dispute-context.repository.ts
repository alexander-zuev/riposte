import { DatabaseError } from '@riposte/core'
import type { SaveStripeDisputeContextInput, StripeDisputeContext } from '@server/domain/disputes'
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

        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe dispute context', cause }),
    })

    return found
  }

  async save(
    input: SaveStripeDisputeContextInput,
  ): Promise<Result<StripeDisputeContext, DatabaseError>> {
    const row = input satisfies DbNewStripeDisputeContext

    const saved = await Result.tryPromise({
      try: async () => {
        const [contextRow] = await this.db
          .insert(stripeDisputeContexts)
          .values(row)
          .onConflictDoUpdate({
            target: stripeDisputeContexts.disputeCaseId,
            set: {
              chargeId: row.chargeId,
              paymentIntentId: row.paymentIntentId,
              chargeCreatedAt: row.chargeCreatedAt,
              chargeReceiptUrl: row.chargeReceiptUrl,
              stripeCustomerId: row.stripeCustomerId,
              customerEmail: row.customerEmail,
              customerName: row.customerName,
              invoiceId: row.invoiceId,
              invoicePdfUrl: row.invoicePdfUrl,
              subscriptionId: row.subscriptionId,
              subscriptionStatus: row.subscriptionStatus,
              subscriptionItems: row.subscriptionItems,
              totalPaidByCurrency: row.totalPaidByCurrency,
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!contextRow) throw new Error('Stripe dispute context save returned no row')
        return contextRow
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save Stripe dispute context', cause }),
    })

    return saved
  }
}
