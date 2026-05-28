import type { UIMessage } from 'ai'
import { z } from 'zod'

import { TimestamptzSchema } from '../primitives'

/**
 * Cross-boundary types for dispute case messages — the append-only audit log
 * of UIMessages emitted by the dispute evidence-collection tool loop.
 *
 * AI SDK ships no runtime exports for `UIMessage`. We enumerate the role
 * literals once and type `parts` via the SDK so the FE renderer is identical
 * to chat; the runtime check on `parts` is intentionally just "is array".
 */

export const uiMessageRoleSchema = z.enum(['system', 'user', 'assistant'])
export type DisputeCaseMessageRole = z.infer<typeof uiMessageRoleSchema>

export const uiMessagePartsSchema = z.custom<UIMessage<never>['parts']>(
  (val) => Array.isArray(val),
  { error: 'parts must be an array of UIMessage parts' },
)
export type DisputeCaseMessageParts = UIMessage<never>['parts']

/**
 * Persisted row. `id` is the UIMessage id assigned by the SDK (a uuidv7 via the
 * stream's `generateMessageId`); it is the PK and the upsert key. One row per
 * agent turn — the same id is rewritten as the message grows across steps.
 */
export const disputeCaseMessageSchema = z.object({
  id: z.uuidv7(),
  productId: z.uuidv4(),
  disputeCaseId: z.string().min(1),
  runId: z.uuid(),
  role: uiMessageRoleSchema,
  parts: uiMessagePartsSchema,
  createdAt: TimestamptzSchema,
})
export type DisputeCaseMessage = z.infer<typeof disputeCaseMessageSchema>

/**
 * WS broadcasts — payload-free invalidation hints sent over the existing agent
 * WebSocket as the DO persists the run's message. `updated` fires per step (live
 * feed); `finished` fires once when the run completes. PG is source of truth;
 * the FE narrows by `type` in `useAgent.onMessage` and invalidates the matching
 * TanStack Query.
 *
 * Plain TS types by design — not Zod-validated at runtime. WS payloads inside
 * our own DO→FE channel don't need defensive parsing; if the shape changes,
 * the TypeScript consumers fail at build time.
 */
export type DisputeCaseMessagesUpdatedBroadcast = {
  type: 'dispute_case_messages_updated'
  disputeCaseId: string
  runId: string
}

export type DisputeCaseMessagesFinishedBroadcast = {
  type: 'dispute_case_messages_finished'
  disputeCaseId: string
  runId: string
}
