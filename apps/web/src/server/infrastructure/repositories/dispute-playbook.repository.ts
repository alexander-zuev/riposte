import { DatabaseError, type UUIDv4 } from '@riposte/core'
import { DisputePlaybook } from '@server/domain/dispute-playbooks'
import type { IDisputePlaybookRepository } from '@server/domain/repository/interfaces'
import type { DbNewDisputePlaybook, DrizzleDb } from '@server/infrastructure/db'
import { disputePlaybooks } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { desc, eq } from 'drizzle-orm'

import { BaseRepository } from './base.repository'

export class DisputePlaybookRepository
  extends BaseRepository
  implements IDisputePlaybookRepository
{
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async save(playbook: DisputePlaybook): Promise<Result<DisputePlaybook, DatabaseError>> {
    const row = playbook.serialize() satisfies DbNewDisputePlaybook

    const saved = await Result.tryPromise({
      try: async () => {
        const [insertedRow] = await this.db.insert(disputePlaybooks).values(row).returning()
        if (!insertedRow) throw new Error('DisputePlaybook insert returned no row')
        this.dispatchEvents(playbook)
        return insertedRow
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to save dispute playbook', cause }),
    })

    return saved.map((insertedRow) => DisputePlaybook.deserialize(insertedRow))
  }

  async findLatestForProduct(
    productId: UUIDv4,
  ): Promise<Result<DisputePlaybook | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select()
          .from(disputePlaybooks)
          .where(eq(disputePlaybooks.productId, productId))
          .orderBy(desc(disputePlaybooks.revision))
          .limit(1)
        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find latest dispute playbook', cause }),
    })

    return found.map((row) => (row ? DisputePlaybook.deserialize(row) : null))
  }
}
