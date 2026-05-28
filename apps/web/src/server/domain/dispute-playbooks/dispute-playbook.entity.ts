import {
  createEvent,
  type PlaybookValidation,
  type PlaybookValidationIssue,
  type UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type { DbDisputePlaybook, DbNewDisputePlaybook } from '@server/infrastructure/db'

import { PLAYBOOK_SECTIONS, PLAYBOOK_SOURCE_MARKER } from './dispute-playbook.sections'

const MIN_SECTION_BODY_LENGTH = 40

export class DisputePlaybook extends Entity<DbNewDisputePlaybook> {
  private constructor(
    readonly id: UUIDv4,
    readonly productId: UUIDv4,
    readonly revision: number,
    public playbookMd: string,
    readonly playbookHash: string,
    readonly createdBy: UUIDv4,
    readonly createdAt: Date,
  ) {
    super()
  }

  /** Write: the first revision of a product's playbook. */
  static async create(input: {
    productId: UUIDv4
    createdBy: UUIDv4
    playbookMd: string
  }): Promise<DisputePlaybook> {
    const playbook = new DisputePlaybook(
      crypto.randomUUID() as UUIDv4,
      input.productId,
      1,
      input.playbookMd,
      await sha256Hex(input.playbookMd),
      input.createdBy,
      new Date(),
    )
    playbook.addEvent(
      createEvent('DisputePlaybookCreated', {
        disputePlaybookId: playbook.id,
        productId: playbook.productId,
        userId: playbook.createdBy,
        revision: playbook.revision,
      }),
    )
    return playbook
  }

  /** Edit: the next revision with new content. Append-only — does not mutate the receiver. */
  async revise(input: { createdBy: UUIDv4; playbookMd: string }): Promise<DisputePlaybook> {
    const playbook = new DisputePlaybook(
      crypto.randomUUID() as UUIDv4,
      this.productId,
      this.revision + 1,
      input.playbookMd,
      await sha256Hex(input.playbookMd),
      input.createdBy,
      new Date(),
    )
    playbook.addEvent(
      createEvent('DisputePlaybookRevised', {
        disputePlaybookId: playbook.id,
        productId: playbook.productId,
        userId: playbook.createdBy,
        revision: playbook.revision,
      }),
    )
    return playbook
  }

  /**
   * Progressive completeness check: what still blocks the playbook from being done.
   * A query, not a guard — `create`/`revise` never gate on it, so the playbook may be
   * persisted incomplete and refined revision by revision. `complete` is true only when
   * nothing remains; the setup-completion step is the hard gate that consumes it.
   */
  validate(): PlaybookValidation {
    const remaining: PlaybookValidationIssue[] = []

    if (!/^#\s+\S.*$/m.test(this.playbookMd)) {
      remaining.push({ section: 'Title', issue: 'missing' })
    }

    for (const section of PLAYBOOK_SECTIONS) {
      const body = sectionBody(this.playbookMd, section.heading)
      if (body === null) {
        if (section.required) remaining.push({ section: section.heading, issue: 'missing' })
        continue
      }
      if (body.length < MIN_SECTION_BODY_LENGTH) {
        remaining.push({ section: section.heading, issue: 'too_short' })
        continue
      }
      if (section.needsSource && !hasFilledSource(body)) {
        remaining.push({ section: section.heading, issue: 'no_source' })
      }
    }

    return { complete: remaining.length === 0, remaining }
  }

  static deserialize(row: DbDisputePlaybook): DisputePlaybook {
    return new DisputePlaybook(
      row.id,
      row.productId,
      row.revision,
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
      revision: this.revision,
      playbookMd: this.playbookMd,
      playbookHash: this.playbookHash,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
    }
  }
}

function hasFilledSource(body: string): boolean {
  return body.split('\n').some((line) => {
    const trimmed = line.trim()
    return (
      trimmed.startsWith(PLAYBOOK_SOURCE_MARKER) &&
      trimmed.slice(PLAYBOOK_SOURCE_MARKER.length).trim().length > 0
    )
  })
}

function sectionBody(content: string, heading: string): string | null {
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return null
  const next = lines.findIndex((line, index) => index > start && line.trim().startsWith('## '))
  return lines
    .slice(start + 1, next === -1 ? undefined : next)
    .join('\n')
    .trim()
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
