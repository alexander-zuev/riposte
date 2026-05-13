import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

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
