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

const syncTimelineSchema = z.enum(['last_120_days'])
export type SyncTimeline = z.infer<typeof syncTimelineSchema>

export const syncDisputesSchema = baseCommandSchema.extend({
  name: z.literal('SyncDisputes'),
  stripeAccountId: z.string().min(1),
  livemode: z.boolean(),
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

export const generateEvidencePacketSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('GenerateEvidencePacket'),
})

export const decideDisputeSubmissionPolicySchema = disputeWorkflowCommandBase.extend({
  name: z.literal('DecideDisputeSubmissionPolicy'),
  evidencePacketId: z.string().min(1),
})

export const submitDisputeResponseSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('SubmitDisputeResponse'),
  evidencePacketId: z.string().min(1),
})

export const disputeSubmissionApprovalResponseSchema = z.discriminatedUnion('action', [
  z.object({
    kind: z.literal('submission_approval'),
    action: z.literal('approve'),
    evidencePacketId: z.uuid(),
  }),
  z.object({
    kind: z.literal('submission_approval'),
    action: z.literal('approve_replacement'),
    evidencePacketId: z.uuid(),
    replacementEvidencePacketId: z.uuid(),
  }),
  z.object({
    kind: z.literal('submission_approval'),
    action: z.literal('decline'),
    evidencePacketId: z.uuid(),
  }),
])

export const handleDisputeSubmissionApprovalResponseSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('HandleDisputeSubmissionApprovalResponse'),
  approvalResponse: disputeSubmissionApprovalResponseSchema,
})

export type TriageDisputeCase = z.infer<typeof triageDisputeCaseSchema>
export type EnrichDisputeContext = z.infer<typeof enrichDisputeContextSchema>
export type CollectDisputeEvidence = z.infer<typeof collectDisputeEvidenceSchema>
export type GenerateEvidencePacket = z.infer<typeof generateEvidencePacketSchema>
export type DecideDisputeSubmissionPolicy = z.infer<typeof decideDisputeSubmissionPolicySchema>
export type SubmitDisputeResponse = z.infer<typeof submitDisputeResponseSchema>
export type DisputeSubmissionApprovalResponse = z.infer<
  typeof disputeSubmissionApprovalResponseSchema
>
export type HandleDisputeSubmissionApprovalResponse = z.infer<
  typeof handleDisputeSubmissionApprovalResponseSchema
>
