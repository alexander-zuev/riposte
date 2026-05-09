import { DatabaseError } from '@riposte/core'
import { DisputeCase } from '@server/domain/disputes'
import type { IDisputeCaseRepository } from '@server/domain/repository/interfaces'
import type { DbNewDisputeCase, DrizzleDb } from '@server/infrastructure/db'
import { disputeCases } from '@server/infrastructure/db'
import { Result } from 'better-result'

export class DisputeCaseRepository implements IDisputeCaseRepository {
  constructor(private readonly db: DrizzleDb) {}

  async save(disputeCase: DisputeCase): Promise<Result<DisputeCase, DatabaseError>> {
    const snapshot = disputeCase.serialize()
    const row = snapshot satisfies DbNewDisputeCase

    const saved = await Result.tryPromise({
      try: async () => {
        const [caseRow] = await this.db
          .insert(disputeCases)
          .values(row)
          .onConflictDoUpdate({
            target: disputeCases.id,
            set: {
              userId: row.userId,
              stripeAccountId: row.stripeAccountId,
              stripeStatus: row.stripeStatus,
              reason: row.reason,
              amountMinor: row.amountMinor,
              currency: row.currency,
              evidenceDueBy: row.evidenceDueBy,
              workflowState: row.workflowState,
              updatedAt: row.updatedAt,
            },
          })
          .returning()

        if (!caseRow) throw new Error('Dispute case save returned no rows')
        return caseRow
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to save dispute case', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(DisputeCase.deserialize(saved.value))
  }
}
