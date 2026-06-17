import { AsyncLocalStorage } from 'node:async_hooks'

import type { UserId } from '@riposte/core'

export const POSTHOG_SESSION_ID_HEADER = 'x-posthog-session-id'

export type AnalyticsContext = {
  distinctId?: UserId
  posthogSessionId?: string
}

export function createAnalyticsContext(input: {
  distinctId?: UserId
  posthogSessionId?: string | null
}): AnalyticsContext {
  const posthogSessionId = input.posthogSessionId?.trim()
  return {
    ...(input.distinctId ? { distinctId: input.distinctId } : {}),
    ...(posthogSessionId ? { posthogSessionId } : {}),
  }
}

/**
 * Stable dedup identity for an event captured while handling a queue message: the message
 * envelope id (always present) plus the event timestamp when the envelope carries one
 * (events do, commands do not). Replayed unchanged on redelivery, so a retried message that
 * re-runs an event's subscribers maps to the same PostHog `uuid` and does not double-count.
 */
export type AnalyticsIdempotencyKey = { uuid: string; timestamp?: string }

/**
 * Ambient analytics context for the current message, set once at the queue boundary
 * (`runWithAnalyticsContext`) and read by `AnalyticsService.track`/`trackAnonymous`.
 *
 * ALS, not `AnalyticsService` instance state: the queue processes a batch concurrently
 * through one shared service (one `AppDeps` per batch), so each `run` frame is isolated per
 * message. Absent for request-scoped server fns (they fire once) — the SDK generates a uuid.
 */
export type AmbientAnalyticsContext = { idempotencyKey?: AnalyticsIdempotencyKey }

const store = new AsyncLocalStorage<AmbientAnalyticsContext>()

export const runWithAnalyticsContext =  async <T>(
  context: AmbientAnalyticsContext,
  work: () => Promise<T>,
): Promise<T> => store.run(context, work)

export const getAnalyticsContext = (): AmbientAnalyticsContext | undefined => store.getStore()
