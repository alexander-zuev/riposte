import { DatabaseError } from '@riposte/core'
import { DisputeCollectedEvidence } from '@server/domain/disputes'
import type { IDisputeCollectedEvidenceRepository } from '@server/domain/repository/interfaces'
import type { DbNewDisputeCollectedEvidence, DrizzleDb } from '@server/infrastructure/db'
import { disputeCollectedEvidence } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { eq } from 'drizzle-orm'

export class DisputeCollectedEvidenceRepository implements IDisputeCollectedEvidenceRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findByDisputeCaseId(
    disputeCaseId: string,
  ): Promise<Result<DisputeCollectedEvidence | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select()
          .from(disputeCollectedEvidence)
          .where(eq(disputeCollectedEvidence.disputeCaseId, disputeCaseId))
          .limit(1)

        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find dispute collected evidence', cause }),
    })

    return found.map((row) => (row ? DisputeCollectedEvidence.deserialize(row) : null))
  }

  async save(
    evidence: DisputeCollectedEvidence,
  ): Promise<Result<DisputeCollectedEvidence, DatabaseError>> {
    const snapshot = evidence.serialize()
    const row = snapshot satisfies DbNewDisputeCollectedEvidence

    const saved = await Result.tryPromise({
      try: async () => {
        const [savedRow] = await this.db
          .insert(disputeCollectedEvidence)
          .values(row)
          .onConflictDoUpdate({
            target: disputeCollectedEvidence.disputeCaseId,
            set: {
              customerMatch: row.customerMatch,
              identityFacts: row.identityFacts,
              activityEvidence: row.activityEvidence,
              visualDeliverables: row.visualDeliverables,
              refundEvidence: row.refundEvidence,
              cancellationEvidence: row.cancellationEvidence,
              uncategorizedEvidence: row.uncategorizedEvidence,
              updatedAt: row.updatedAt,
            },
          })
          .returning()

        if (!savedRow) throw new Error('Dispute collected evidence save returned no row')
        return savedRow
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save dispute collected evidence', cause }),
    })

    return saved.map((savedRow) => DisputeCollectedEvidence.deserialize(savedRow))
  }
}
