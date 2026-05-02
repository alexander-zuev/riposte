import { createLogger } from '@riposte/core/client'

const logger = createLogger('scheduled')

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  logger.info('cron_triggered', { cron: controller.cron })
}
