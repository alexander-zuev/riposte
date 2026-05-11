import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { stripeWebhookEventSchema } from '../stripe'

const disputeCommandBase = baseCommandSchema.extend({
  stripeEvent: stripeWebhookEventSchema,
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

const disputeWorkflowCommandBase = baseCommandSchema.extend({
  disputeCaseId: z.string().min(1),
})

export const triageDisputeCaseSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('TriageDisputeCase'),
})

export const enrichDisputeContextSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('EnrichDisputeContext'),
})

export const collectDisputeEvidenceSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('CollectDisputeEvidence'),
})

export const prepareEvidencePacketSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('PrepareEvidencePacket'),
})

export const reviewEvidencePacketSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('ReviewEvidencePacket'),
})

export const decideDisputeSubmissionSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('DecideDisputeSubmission'),
})

export const submitDisputeResponseSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('SubmitDisputeResponse'),
})

export type TriageDisputeCase = z.infer<typeof triageDisputeCaseSchema>
export type EnrichDisputeContext = z.infer<typeof enrichDisputeContextSchema>
export type CollectDisputeEvidence = z.infer<typeof collectDisputeEvidenceSchema>
export type PrepareEvidencePacket = z.infer<typeof prepareEvidencePacketSchema>
export type ReviewEvidencePacket = z.infer<typeof reviewEvidencePacketSchema>
export type DecideDisputeSubmission = z.infer<typeof decideDisputeSubmissionSchema>
export type SubmitDisputeResponse = z.infer<typeof submitDisputeResponseSchema>
