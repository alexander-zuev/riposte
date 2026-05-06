import { createLogger } from '@riposte/core'
import { createAppDeps } from '@server/infrastructure/app-deps'

const logger = createLogger('scheduled')

const OUTBOX_RELAY_CRON = '*/1 * * * *'

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
    if (result.isErr()) throw result.error
    return
  }

  logger.warn('unhandled_cron', { cron: controller.cron })
}
