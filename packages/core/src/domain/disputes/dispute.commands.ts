import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

const disputeCommandBase = baseCommandSchema.extend({
  userId: UserIdSchema,
  stripeEvent: z.record(z.string(), z.unknown()),
})

export const ingestDisputeCreatedSchema = disputeCommandBase.extend({
  name: z.literal('IngestDisputeCreated'),
})

export const ingestDisputeUpdatedSchema = disputeCommandBase.extend({
  name: z.literal('IngestDisputeUpdated'),
})

export const ingestDisputeClosedSchema = disputeCommandBase.extend({
  name: z.literal('IngestDisputeClosed'),
})

export const ingestDisputeFundsReinstatedSchema = disputeCommandBase.extend({
  name: z.literal('IngestDisputeFundsReinstated'),
})

export const ingestDisputeFundsWithdrawnSchema = disputeCommandBase.extend({
  name: z.literal('IngestDisputeFundsWithdrawn'),
})

export type IngestDisputeCreated = z.infer<typeof ingestDisputeCreatedSchema>
export type IngestDisputeUpdated = z.infer<typeof ingestDisputeUpdatedSchema>
export type IngestDisputeClosed = z.infer<typeof ingestDisputeClosedSchema>
export type IngestDisputeFundsReinstated = z.infer<typeof ingestDisputeFundsReinstatedSchema>
export type IngestDisputeFundsWithdrawn = z.infer<typeof ingestDisputeFundsWithdrawnSchema>

const syncTimelineSchema = z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'last_365_days'])
export type SyncTimeline = z.infer<typeof syncTimelineSchema>

export const syncDisputesSchema = baseCommandSchema.extend({
  name: z.literal('SyncDisputes'),
  stripeAccountId: z.string().min(1),
  timeline: syncTimelineSchema,
})

export type SyncDisputes = z.infer<typeof syncDisputesSchema>
