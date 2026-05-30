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
  syncRequestId: z.uuidv7().optional(),
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

export const startDisputeEvidenceCollectionSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('StartDisputeEvidenceCollection'),
  workflowInstanceId: z.string().min(1),
})

/**
 * Dispatched from the chat agent's `startDryRun` tool during setup mode.
 * Handler creates a synthetic `dispute_cases` row and triggers the evidence
 * loop. v1 only — replaced by Stripe test-mode integration in slice 5.
 */
export const startDryRunSchema = baseCommandSchema.extend({
  name: z.literal('StartDryRun'),
  productId: z.uuidv4(),
})
export type StartDryRun = z.infer<typeof startDryRunSchema>

export const completeDisputeEvidenceCollectionSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('CompleteDisputeEvidenceCollection'),
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

/**
 * Transitions a dispute case to `failed`. Reason is a structured string for
 * triage (e.g. 'workflow_unexpected_error'); message is optional human detail.
 * Used by the workflow top-level catch and (future) cron reconciler — NOT for
 * expected business outcomes.
 */
export const failDisputeCaseSchema = disputeWorkflowCommandBase.extend({
  name: z.literal('FailDisputeCase'),
  reason: z.string().min(1),
  message: z.string().optional(),
})

export type TriageDisputeCase = z.infer<typeof triageDisputeCaseSchema>
export type EnrichDisputeContext = z.infer<typeof enrichDisputeContextSchema>
export type StartDisputeEvidenceCollection = z.infer<typeof startDisputeEvidenceCollectionSchema>
export type CompleteDisputeEvidenceCollection = z.infer<
  typeof completeDisputeEvidenceCollectionSchema
>
export type GenerateEvidencePacket = z.infer<typeof generateEvidencePacketSchema>
export type DecideDisputeSubmissionPolicy = z.infer<typeof decideDisputeSubmissionPolicySchema>
export type SubmitDisputeResponse = z.infer<typeof submitDisputeResponseSchema>
export type DisputeSubmissionApprovalResponse = z.infer<
  typeof disputeSubmissionApprovalResponseSchema
>
export type HandleDisputeSubmissionApprovalResponse = z.infer<
  typeof handleDisputeSubmissionApprovalResponseSchema
>
export type FailDisputeCase = z.infer<typeof failDisputeCaseSchema>
