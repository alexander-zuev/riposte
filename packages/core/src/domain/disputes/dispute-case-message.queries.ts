import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { disputeCaseMessageSchema } from './dispute-case-message.dto'

/**
 * One dispute case's activity: its persisted messages, ascending by time. The
 * server orders cases by their first message (start time); within a case
 * messages are oldest-first. No timestamp field — callers read `messages[0]`
 * (start) or `messages.at(-1)` (latest) as needed. Shared unit returned by both
 * the product-wide list and the single-case get.
 */
export const disputeCaseActivitySchema = z.object({
  disputeCaseId: z.string().min(1),
  messages: z.array(disputeCaseMessageSchema),
})
export type DisputeCaseActivity = z.infer<typeof disputeCaseActivitySchema>

/**
 * Product-wide activity feed (the `/agents` Activity tab). The limit applies to
 * dispute cases, not raw messages — each case carries its full message list.
 */
export const listDisputeCaseActivitySchema = baseQuerySchema.extend({
  name: z.literal('ListDisputeCaseActivity'),
  productId: z.uuidv4(),
  disputeCaseLimit: z.number().int().min(1).max(50).default(15),
})
export type ListDisputeCaseActivity = z.infer<typeof listDisputeCaseActivitySchema>

export const listDisputeCaseActivityResultSchema = z.object({
  cases: z.array(disputeCaseActivitySchema),
})
export type ListDisputeCaseActivityResult = z.infer<typeof listDisputeCaseActivityResultSchema>

/**
 * Single dispute case's activity (the `disputes/:id` view). Returns the case's
 * activity bundle, or null when it has no recorded activity yet.
 */
export const getDisputeCaseActivitySchema = baseQuerySchema.extend({
  name: z.literal('GetDisputeCaseActivity'),
  productId: z.uuidv4(),
  disputeCaseId: z.string().min(1),
  limit: z.number().int().min(1).max(500).default(200),
})
export type GetDisputeCaseActivity = z.infer<typeof getDisputeCaseActivitySchema>

export const getDisputeCaseActivityResultSchema = z.object({
  activity: disputeCaseActivitySchema.nullable(),
})
export type GetDisputeCaseActivityResult = z.infer<typeof getDisputeCaseActivityResultSchema>
