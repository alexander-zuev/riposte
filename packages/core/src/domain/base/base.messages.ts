import { z } from 'zod'

import { TimestamptzSchema, UserIdSchema } from '../primitives'

/**
 * Base schemas for domain messages
 *
 * Commands/events have:
 * - id: message idempotency key. Internal messages use UUIDv4; external messages
 *   can use namespaced provider keys such as `stripe:event:evt_123`.
 * - type: Discriminator for routing (command/event/query/external)
 * - name: Specific message name for handler lookup
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal Messages (created by our code)
// ─────────────────────────────────────────────────────────────────────────────

export const externalMessageIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+:[A-Za-z0-9_.:-]+$/)

export const MessageIdSchema = z.union([z.uuidv4(), externalMessageIdSchema])

// Shared base - identity + routing
// userId is optional here — messages with user context override with required.
// Allows typed access to message.userId for observability (Sentry user context).
const baseInternalSchema = z.object({
  name: z.string().min(1),
  userId: UserIdSchema.optional(),
})

// Command: imperative intent ("do this")
// - One handler per command
// - Failure stops processing
export const baseCommandSchema = baseInternalSchema.extend({
  id: MessageIdSchema,
  type: z.literal('command'),
})

// Event: past-tense fact ("this happened")
// - Zero to N handlers
// - Failure in one handler doesn't stop others
export const baseEventSchema = baseInternalSchema.extend({
  id: z.uuidv4(),
  type: z.literal('event'),
  timestamp: TimestamptzSchema,
})

// Query: data request
// - One handler per query
// - Read-only, synchronous, no idempotency needed
export const baseQuerySchema = baseInternalSchema.extend({
  type: z.literal('query'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BaseCommand = z.infer<typeof baseCommandSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type BaseQuery = z.infer<typeof baseQuerySchema>
export type MessageId = z.infer<typeof MessageIdSchema>
