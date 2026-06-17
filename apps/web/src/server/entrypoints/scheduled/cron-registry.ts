import { z } from 'zod'

/**
 * The cron schedules this Worker dispatches — the single source of truth for the
 * scheduled handler. Cloudflare types `ScheduledController.cron` as bare `string`
 * and `wrangler types` never emits the `triggers.crons` union, so we define it here.
 *
 * The `wrangler.jsonc` `triggers.crons` array must stay a subset of these values;
 * the cron-registry drift test asserts that binding.
 */
export const CRON = {
  OUTBOX_RELAY: '*/1 * * * *',
  DISPUTE_SYNC: '0 3 * * *',
} as const

/** A cron expression this Worker knows how to dispatch. */
export type CronExpression = (typeof CRON)[keyof typeof CRON]

/**
 * Parse `controller.cron` (bare `string` from the platform) into a known schedule.
 * A miss means wrangler fires a cron the handler doesn't route — surfaced loudly at
 * the boundary instead of silently falling through to a default branch.
 */
export const CronSchema = z.enum(CRON)

/**
 * Human cadence per schedule — a readability aid for the raw cron strings (logs,
 * scanning the registry). `satisfies` forces a label for every cron. Time-of-day is
 * omitted: it's fixed UTC and not the interesting part. Hand-maintained — the only
 * field tsc can't bind back to the expression.
 */
export const CRON_CADENCE = {
  OUTBOX_RELAY: 'every minute',
  DISPUTE_SYNC: 'daily',
} satisfies Record<keyof typeof CRON, string>
