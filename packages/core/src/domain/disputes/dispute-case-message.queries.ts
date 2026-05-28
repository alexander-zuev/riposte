import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { disputeCaseMessageSchema } from './dispute-case-message.dto'

/**
 * Reads messages for one exact dispute case. Product-wide Activity uses
 * `ListDisputeCaseActivity` so the limit applies to dispute cases, not raw
 * messages.
 */
export const listDisputeCaseMessagesSchema = baseQuerySchema.extend({
  name: z.literal('ListDisputeCaseMessages'),
  productId: z.uuidv4(),
  disputeCaseId: z.string().min(1),
  limit: z.number().int().min(1).max(500).default(200),
})
export type ListDisputeCaseMessages = z.infer<typeof listDisputeCaseMessagesSchema>

export const listDisputeCaseMessagesResultSchema = z.object({
  items: z.array(disputeCaseMessageSchema),
})
export type ListDisputeCaseMessagesResult = z.infer<typeof listDisputeCaseMessagesResultSchema>

export const disputeCaseActivitySchema = z.object({
  disputeCaseId: z.string().min(1),
  latestMessageCreatedAt: z.string().min(1),
  messages: z.array(disputeCaseMessageSchema),
})
export type DisputeCaseActivity = z.infer<typeof disputeCaseActivitySchema>

export const listDisputeCaseActivitySchema = baseQuerySchema.extend({
  name: z.literal('ListDisputeCaseActivity'),
  productId: z.uuidv4(),
  disputeCaseLimit: z.number().int().min(1).max(50).default(15),
})
export type ListDisputeCaseActivity = z.infer<typeof listDisputeCaseActivitySchema>

export const listDisputeCaseActivityResultSchema = z.object({
  cases: z.array(disputeCaseActivitySchema),
})
export type ListDisputeCaseActivityResult = z.infer<
  typeof listDisputeCaseActivityResultSchema
>
