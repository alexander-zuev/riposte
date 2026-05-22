import {
  ValidationError,
  createEvent,
  createPlaybookInputSchema,
  type CreatePlaybookInput,
  type UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type { DbDisputePlaybook, DbNewDisputePlaybook } from '@server/infrastructure/db'
import { Result } from 'better-result'

export type CreateDisputePlaybookInput = CreatePlaybookInput & {
  previousPlaybook?: DisputePlaybook | null
}

export class DisputePlaybook extends Entity<DbNewDisputePlaybook> {
  private constructor(
    readonly id: UUIDv4,
    readonly productId: UUIDv4,
    readonly version: number,
    public playbookMd: string,
    readonly playbookHash: string,
    readonly createdBy: UUIDv4,
    readonly createdAt: Date,
  ) {
    super()
  }

  static async create(
    input: CreateDisputePlaybookInput,
  ): Promise<Result<DisputePlaybook, ValidationError>> {
    const parsed = createPlaybookInputSchema.safeParse(input)
    if (!parsed.success) {
      return Result.err(
        new ValidationError({
          issues: parsed.error.issues.map((issue) => ({
            code: issue.code,
            path: issue.path.map(String),
            message: issue.message,
          })),
        }),
      )
    }

    const version = (input.previousPlaybook?.version ?? 0) + 1
    const playbookHash = await sha256Hex(parsed.data.playbookMd)

    const playbook = new DisputePlaybook(
      crypto.randomUUID() as UUIDv4,
      parsed.data.productId,
      version,
      parsed.data.playbookMd,
      playbookHash,
      parsed.data.createdBy,
      new Date(),
    )

    playbook.addEvent(
      createEvent('DisputePlaybookCreated', {
        disputePlaybookId: playbook.id,
        productId: playbook.productId,
        userId: playbook.createdBy,
        version: playbook.version,
      }),
    )

    return Result.ok(playbook)
  }

  static deserialize(row: DbDisputePlaybook): DisputePlaybook {
    return new DisputePlaybook(
      row.id,
      row.productId,
      row.version,
      row.playbookMd,
      row.playbookHash,
      row.createdBy,
      row.createdAt,
    )
  }

  serialize(): DbNewDisputePlaybook {
    return {
      id: this.id,
      productId: this.productId,
      version: this.version,
      playbookMd: this.playbookMd,
      playbookHash: this.playbookHash,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
    }
  }
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
