import { PostHog } from 'posthog-node'

import { getAnalyticsContext, type AnalyticsContext } from './analytics-context'

/** PostHog US Cloud ingest host — same across all envs. Browser uses the relay (lib/env/env.ts). */
const POSTHOG_HOST = 'https://us.i.posthog.com'

export type AnalyticsEvent = {
  name: string
  properties?: Record<string, unknown>
}

export interface IAnalyticsService {
  /** Raw PostHog client. Required by `@posthog/ai` `withTracing` for LLM analytics. */
  readonly posthog: PostHog
  setContext: (context: AnalyticsContext) => void
  track: (event: AnalyticsEvent, overrides?: AnalyticsContext) => void
  /**
   * Capture without a person profile (`$process_person_profile: false`). For events whose
   * distinctId is a system/cron/job/dispute id rather than a real user — avoids minting junk
   * person profiles (and cross-entity merges when an id is reused as a distinctId).
   */
  trackAnonymous: (event: AnalyticsEvent, overrides?: AnalyticsContext) => void
}

/**
 * PostHog analytics client for Cloudflare Workers.
 *
 * `flushAt: 1`/`flushInterval: 0` opt out of batching/debouncing because there
 * is no long-lived process to flush from. `track` uses `captureImmediate` for
 * direct HTTP send, and `waitUntil` keeps the runtime alive past response
 * completion so the send finishes before the Worker is frozen. `identify`
 * queues via the SDK's debounced flush; `waitUntil` on the SDK handles the
 * flush itself.
 */
export class AnalyticsService implements IAnalyticsService {
  private readonly client: PostHog
  private readonly ctx: Pick<ExecutionContext, 'waitUntil'>
  private readonly env: string
  private context: AnalyticsContext = {}

  constructor(env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>) {
    this.ctx = ctx
    this.client = new PostHog(env.POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      waitUntil: (promise) => ctx.waitUntil(promise),
    })
    this.env = env.ENV
  }

  /** Raw PostHog client — used by LLM tracing (`@posthog/ai` `withTracing`). */
  get posthog(): PostHog {
    return this.client
  }

  setContext(context: AnalyticsContext): void {
    this.context = context
  }

  track(event: AnalyticsEvent, overrides: AnalyticsContext = {}): void {
    this.capture(event, overrides, true)
  }

  trackAnonymous(event: AnalyticsEvent, overrides: AnalyticsContext = {}): void {
    this.capture(event, overrides, false)
  }

  private capture(
    event: AnalyticsEvent,
    overrides: AnalyticsContext,
    processPersonProfile: boolean,
  ): void {
    const distinctId = overrides.distinctId ?? this.context.distinctId
    const posthogSessionId = overrides.posthogSessionId ?? this.context.posthogSessionId
    // Stamp PostHog's dedup keys from the ambient message context when present, so a redelivered
    // queue message that re-runs an event's subscribers does not double-count. Absent (request
    // context, fires once) → the SDK generates a uuid.
    const idempotencyKey = getAnalyticsContext()?.idempotencyKey
    this.ctx.waitUntil(
      this.client.captureImmediate({
        ...(distinctId ? { distinctId } : {}),
        event: event.name,
        properties: {
          ...event.properties,
          source: 'worker',
          _env: this.env,
          ...(posthogSessionId ? { $session_id: posthogSessionId } : {}),
          ...(processPersonProfile ? {} : { $process_person_profile: false }),
        },
        ...(idempotencyKey
          ? {
              uuid: idempotencyKey.uuid,
              ...(idempotencyKey.timestamp
                ? { timestamp: new Date(idempotencyKey.timestamp) }
                : {}),
            }
          : {}),
      }),
    )
  }
}
