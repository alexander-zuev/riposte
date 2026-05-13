import { createEvent, createLogger } from '@riposte/core'
import type { DOUnreachableError, QueueError } from '@riposte/core'
import { createAppDeps } from '@server/infrastructure/app-deps'
import type { Result } from 'better-result'

const logger = createLogger('scheduled')

const OUTBOX_RELAY_CRON = '*/1 * * * *'
const DISPUTE_SYNC_CRON = '0 3 * * *'

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  logger.info('cron_triggered', {
    cron: controller.cron,
    scheduledTime: controller.scheduledTime,
  })

  if (controller.cron === OUTBOX_RELAY_CRON) {
    const deps = createAppDeps(env, ctx)
    const result = await deps.hooks.triggerOutboxRelay()
    throwCronFailure(result, 'outbox_relay_cron_failed')
    return
  }

  if (controller.cron === DISPUTE_SYNC_CRON) {
    const deps = createAppDeps(env, ctx)
    const event = createEvent('ScheduledDisputeSyncDue', {})
    const result = await deps.services.queueClient().send(event)
    throwCronFailure(result, 'scheduled_dispute_sync_queue_failed')
    return
  }

  logger.warn('unhandled_cron', { cron: controller.cron })
}

function throwCronFailure(
  result: Result<void, DOUnreachableError | QueueError>,
  eventName: string,
): void {
  if (result.isOk()) return

  logger.error(eventName, { error: result.error })
  throw result.error
}
