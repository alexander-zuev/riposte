import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { uiMessagePartsSchema, uiMessageRoleSchema } from './dispute-case-message.dto'

/**
 * Per-message payload supplied by the agent per step. Identity-mapped from
 * UIMessage's `id` / `role` / `parts`; the repo writes `payload.id` into
 * `row.messageId`.
 */
export const appendedDisputeCaseMessageSchema = z.object({
  id: z.string().min(1),
  role: uiMessageRoleSchema,
  parts: uiMessagePartsSchema,
})
export type AppendedDisputeCaseMessage = z.infer<typeof appendedDisputeCaseMessageSchema>

/**
 * Dispatched from the DO on each tool-loop step finish. Idempotent on
 * (disputeCaseId, message.id) — re-running a step is safe.
 */
export const appendDisputeCaseMessagesSchema = baseCommandSchema.extend({
  name: z.literal('AppendDisputeCaseMessages'),
  productId: z.uuidv4(),
  disputeCaseId: z.string().min(1),
  runId: z.uuid(),
  messages: z.array(appendedDisputeCaseMessageSchema).min(1),
})
export type AppendDisputeCaseMessages = z.infer<typeof appendDisputeCaseMessagesSchema>
