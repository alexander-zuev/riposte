import { z } from 'zod'

import { TimestamptzSchema, UserIdSchema } from '../primitives'

/**
 * Base schemas for domain messages
 *
 * All messages have:
 * - id: UUID for idempotency/deduplication
 * - type: Discriminator for routing (command/event/query/external)
 * - name: Specific message name for handler lookup
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal Messages (created by our code)
// ─────────────────────────────────────────────────────────────────────────────

// Shared base - identity + routing
// userId is optional here — messages with user context override with required.
// Allows typed access to message.userId for observability (Sentry user context).
const baseInternalSchema = z.object({
  id: z.uuidv4(),
  name: z.string().min(1),
  userId: UserIdSchema.optional(),
})

// Command: imperative intent ("do this")
// - One handler per command
// - Failure stops processing
export const baseCommandSchema = baseInternalSchema.extend({
  type: z.literal('command'),
})

// Event: past-tense fact ("this happened")
// - Zero to N handlers
// - Failure in one handler doesn't stop others
export const baseEventSchema = baseInternalSchema.extend({
  type: z.literal('event'),
  timestamp: TimestamptzSchema,
})

// Query: data request
// - One handler per query
// - Read-only, synchronous, no idempotency needed
export const baseQuerySchema = baseInternalSchema.omit({ id: true }).extend({
  type: z.literal('query'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BaseCommand = z.infer<typeof baseCommandSchema>
export type BaseEvent = z.infer<typeof baseEventSchema>
export type BaseQuery = z.infer<typeof baseQuerySchema>
