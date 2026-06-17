import { createEvent, createLogger } from '@riposte/core'
import type { DOUnreachableError, QueueError } from '@riposte/core'
import type { AppDeps } from '@server/infrastructure/app-deps'
import type { Result } from 'better-result'

import { CRON, CronSchema } from './cron-registry'

const logger = createLogger('scheduled')

/**
 * Cron handler — routes a known schedule to its job.
 *
 * `controller.cron` arrives as bare `string`; `CronSchema` narrows it to a known
 * schedule and a miss is logged loudly (wrangler fires a cron we don't route)
 * rather than silently falling through to a default branch. The exhaustive switch
 * makes adding a `CRON` entry without a route a compile error.
 *
 * Both crons drive a single job, so errors propagate — withSentry captures and CF
 * marks the invocation failed (the truthful status; cron has no retry, the next
 * tick is the retry).
 */
export async function scheduled(controller: ScheduledController, deps: AppDeps): Promise<void> {
  logger.info('cron_triggered', {
    cron: controller.cron,
    scheduledTime: controller.scheduledTime,
  })

  const parsed = CronSchema.safeParse(controller.cron)
  if (!parsed.success) {
    logger.error('scheduled_unknown_cron', { cron: controller.cron })
    return
  }

  const cronExpression = parsed.data
  switch (cronExpression) {
    case CRON.OUTBOX_RELAY: {
      const result = await deps.hooks.triggerOutboxRelay()
      throwCronFailure(result, 'outbox_relay_cron_failed')
      return
    }
    case CRON.DISPUTE_SYNC: {
      const event = createEvent('ScheduledDisputeSyncDue', {})
      const result = await deps.services.queueClient().send(event)
      throwCronFailure(result, 'scheduled_dispute_sync_queue_failed')
      return
    }
    default:
      cronExpression satisfies never
  }
}

function throwCronFailure(
  result: Result<void, DOUnreachableError | QueueError>,
  eventName: string,
): void {
  if (result.isOk()) return

  logger.error(eventName, { error: result.error })
  throw result.error
}
