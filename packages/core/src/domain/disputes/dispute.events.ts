import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'
import {
  stripeDisputeEvidenceProductTypeSchema,
  stripeDisputeReasonCodeCategorySchema,
} from './stripe-dispute-taxonomy'

export const disputeCaseReceivedSchema = baseEventSchema.extend({
  name: z.literal('DisputeCaseReceived'),
  disputeCaseId: z.string().min(1),
  productId: z.uuidv4(),
  userId: z.string().min(1),
})

export type DisputeCaseReceived = z.infer<typeof disputeCaseReceivedSchema>

export const disputeCaseCompletedSchema = baseEventSchema.extend({
  name: z.literal('DisputeCaseCompleted'),
  disputeCaseId: z.string().min(1),
  userId: z.string().min(1),
  reason: z.string().min(1),
})

export type DisputeCaseCompleted = z.infer<typeof disputeCaseCompletedSchema>

export const disputeCaseFailedSchema = baseEventSchema.extend({
  name: z.literal('DisputeCaseFailed'),
  disputeCaseId: z.string().min(1),
  userId: z.string().min(1),
  reason: z.string().min(1),
})

export type DisputeCaseFailed = z.infer<typeof disputeCaseFailedSchema>

export const disputeEvidencePacketCreatedSchema = baseEventSchema.extend({
  name: z.literal('DisputeEvidencePacketCreated'),
  disputeEvidencePacketId: z.uuid(),
  disputeCaseId: z.string().min(1),
  userId: z.uuid(),
  version: z.number().int().positive(),
  reasonCodeCategory: stripeDisputeReasonCodeCategorySchema,
  productType: stripeDisputeEvidenceProductTypeSchema,
})

export type DisputeEvidencePacketCreated = z.infer<typeof disputeEvidencePacketCreatedSchema>

export const disputeEvidenceCollectionCompletedSchema = baseEventSchema.extend({
  name: z.literal('DisputeEvidenceCollectionCompleted'),
  disputeCaseId: z.string().min(1),
})

export type DisputeEvidenceCollectionCompleted = z.infer<
  typeof disputeEvidenceCollectionCompletedSchema
>

export const disputeEvidenceCollectionNeedsInputSchema = baseEventSchema.extend({
  name: z.literal('DisputeEvidenceCollectionNeedsInput'),
  disputeCaseId: z.string().min(1),
  missingInputs: z.array(z.string().min(1)),
})

export type DisputeEvidenceCollectionNeedsInput = z.infer<
  typeof disputeEvidenceCollectionNeedsInputSchema
>

export const disputeEvidenceCollectionFailedSchema = baseEventSchema.extend({
  name: z.literal('DisputeEvidenceCollectionFailed'),
  disputeCaseId: z.string().min(1),
})

export type DisputeEvidenceCollectionFailed = z.infer<typeof disputeEvidenceCollectionFailedSchema>

export const scheduledDisputeSyncDueSchema = baseEventSchema.extend({
  name: z.literal('ScheduledDisputeSyncDue'),
})

export type ScheduledDisputeSyncDue = z.infer<typeof scheduledDisputeSyncDueSchema>
