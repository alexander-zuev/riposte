import { createLogger } from '@riposte/core'
import { callDo } from '@server/infrastructure/durable-objects/call-do'
import { OUTBOX_RELAY_ID } from '@server/infrastructure/durable-objects/outbox-relay-do'

const logger = createLogger('scheduled')

const OUTBOX_RELAY_CRON = '*/1 * * * *'

export async function scheduled(
  controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  logger.info('cron_triggered', {
    cron: controller.cron,
    scheduledTime: controller.scheduledTime,
  })

  if (controller.cron === OUTBOX_RELAY_CRON) {
    const relayStub = env.OUTBOX_RELAY.get(env.OUTBOX_RELAY.idFromName(OUTBOX_RELAY_ID))
    const result = await callDo(() => relayStub.trigger())
    if (result.isErr()) throw result.error
    return
  }

  logger.warn('unhandled_cron', { cron: controller.cron })
}
