import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { uiMessagePartsSchema, uiMessageRoleSchema } from './dispute-case-message.dto'

/**
 * The agent turn's assembled UIMessage — `id` / `role` / `parts` as the AI SDK
 * produces them. `id` is the SDK-assigned message id (a uuidv7) and is stable
 * across the turn's steps; the repo upserts on it.
 */
export const disputeCaseMessageInputSchema = z.object({
  id: z.uuidv7(),
  role: uiMessageRoleSchema,
  parts: uiMessagePartsSchema,
})
export type DisputeCaseMessageInput = z.infer<typeof disputeCaseMessageInputSchema>

/**
 * Dispatched from the DO on each tool-loop step finish and again on turn finish.
 * Carries one cumulative message; the repo upserts on `message.id` so each call
 * overwrites the same row as the message grows.
 */
export const saveDisputeCaseMessageSchema = baseCommandSchema.extend({
  name: z.literal('SaveDisputeCaseMessage'),
  productId: z.uuidv4(),
  disputeCaseId: z.string().min(1),
  runId: z.uuid(),
  message: disputeCaseMessageInputSchema,
})
export type SaveDisputeCaseMessage = z.infer<typeof saveDisputeCaseMessageSchema>
