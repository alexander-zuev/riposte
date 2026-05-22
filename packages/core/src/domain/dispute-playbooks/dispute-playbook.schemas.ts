import { z } from 'zod'

/** Generous upper bound; expected playbooks are 2-50KB markdown. */
export const PLAYBOOK_MD_MAX_LENGTH = 1_000_000

export const createPlaybookInputSchema = z.object({
  productId: z.uuidv4(),
  createdBy: z.uuidv4(),
  playbookMd: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
})

export const verifiedPlaybookSectionSchema = z.object({
  verifiedAgainst: z.string().trim().min(1),
  toolCallId: z.string().trim().min(1),
  summary: z.string().trim().min(1),
})

export const cancellationDetectionVerificationSchema = z.discriminatedUnion('kind', [
  verifiedPlaybookSectionSchema.extend({ kind: z.literal('verified') }),
  z.object({
    kind: z.literal('not_applicable'),
    reason: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('no_subscription_cancellation_flow'),
    reason: z.string().trim().min(1),
  }),
])

export const refundRequestDetectionVerificationSchema = z.discriminatedUnion('kind', [
  verifiedPlaybookSectionSchema.extend({ kind: z.literal('verified') }),
  z.object({
    kind: z.literal('stripe_refunds_only'),
    reason: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('no_external_refund_request_source'),
    reason: z.string().trim().min(1),
  }),
])

export const playbookVerificationSchema = z.object({
  customerMatching: verifiedPlaybookSectionSchema,
  activitySources: verifiedPlaybookSectionSchema,
  cancellationDetection: cancellationDetectionVerificationSchema,
  refundRequestDetection: refundRequestDetectionVerificationSchema,
})

export const saveDisputePlaybookResultSchema = z.object({
  disputePlaybookId: z.uuidv4(),
  version: z.number().int().positive(),
  playbookHash: z.string().min(1),
})

export type CreatePlaybookInput = z.infer<typeof createPlaybookInputSchema>
export type PlaybookVerification = z.infer<typeof playbookVerificationSchema>
export type SaveDisputePlaybookResult = z.infer<typeof saveDisputePlaybookResultSchema>
