import { DatabaseError } from '@riposte/core'
import { DisputeEvidencePacket } from '@server/domain/disputes'
import type { IDisputeEvidencePacketRepository } from '@server/domain/repository/interfaces'
import type { DbNewDisputeEvidencePacket, DrizzleDb } from '@server/infrastructure/db'
import { disputeEvidencePackets } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, desc, eq } from 'drizzle-orm'

export class DisputeEvidencePacketRepository implements IDisputeEvidencePacketRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findLatestByDisputeCaseId(input: {
    userId: string
    disputeCaseId: string
  }): Promise<Result<DisputeEvidencePacket | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select()
          .from(disputeEvidencePackets)
          .where(
            and(
              eq(disputeEvidencePackets.userId, input.userId),
              eq(disputeEvidencePackets.disputeCaseId, input.disputeCaseId),
            ),
          )
          .orderBy(desc(disputeEvidencePackets.version))
          .limit(1)

        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find dispute evidence packet', cause }),
    })

    return found.map((row) => (row ? DisputeEvidencePacket.deserialize(row) : null))
  }

  async save(packet: DisputeEvidencePacket): Promise<Result<DisputeEvidencePacket, DatabaseError>> {
    const snapshot = packet.serialize()
    const row = snapshot satisfies DbNewDisputeEvidencePacket

    const saved = await Result.tryPromise({
      try: async () => {
        const [packetRow] = await this.db.insert(disputeEvidencePackets).values(row).returning()

        if (!packetRow) throw new Error('Dispute evidence packet save returned no row')
        return packetRow
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save dispute evidence packet', cause }),
    })

    return saved.map((packetRow) => DisputeEvidencePacket.deserialize(packetRow))
  }
}
