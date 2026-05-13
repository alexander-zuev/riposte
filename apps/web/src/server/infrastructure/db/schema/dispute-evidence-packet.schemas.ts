import type { SupportedVisualEvidenceCategory } from '@riposte/core'
import type {
  DisputeEvidencePacketArtifact,
  DisputeEvidencePdfDocument,
  EvidenceQuality,
  FraudDigitalStripeEvidencePayload,
} from '@server/domain/disputes'
import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'
import { disputeCases } from './dispute-case.schemas'

export const disputeEvidencePackets = pgTable(
  'dispute_evidence_packets',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    disputeCaseId: text('dispute_case_id')
      .notNull()
      .references(() => disputeCases.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    category: text('category').$type<SupportedVisualEvidenceCategory>().notNull().default('fraudulent'),
    stripeEvidencePayload: jsonb('stripe_evidence_payload')
      .$type<FraudDigitalStripeEvidencePayload>()
      .notNull(),
    pdfDocument: jsonb('pdf_document').$type<DisputeEvidencePdfDocument>().notNull(),
    artifacts: jsonb('artifacts').$type<DisputeEvidencePacketArtifact[]>().notNull(),
    evidenceQuality: text('evidence_quality').$type<EvidenceQuality>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('dispute_evidence_packets_user_dispute_case_idx').on(table.userId, table.disputeCaseId),
    unique('dispute_evidence_packets_case_version_unique').on(table.disputeCaseId, table.version),
  ],
)

export type DbDisputeEvidencePacket = typeof disputeEvidencePackets.$inferSelect
export type DbNewDisputeEvidencePacket = typeof disputeEvidencePackets.$inferInsert
