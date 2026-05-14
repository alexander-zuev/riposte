import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'
import {
  stripeDisputeEvidenceProductTypeSchema,
  stripeDisputeReasonCodeCategorySchema,
} from './stripe-dispute-taxonomy'

export const disputeCaseReceivedSchema = baseEventSchema.extend({
  name: z.literal('DisputeCaseReceived'),
  disputeCaseId: z.string().min(1),
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

export const scheduledDisputeSyncDueSchema = baseEventSchema.extend({
  name: z.literal('ScheduledDisputeSyncDue'),
})

export type ScheduledDisputeSyncDue = z.infer<typeof scheduledDisputeSyncDueSchema>
