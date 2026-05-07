import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { createAppDeps } from '@server/infrastructure/app-deps'
import type { AppDeps } from '@server/infrastructure/app-deps'
import { DurableObject } from 'cloudflare:workers'

export { OUTBOX_RELAY_ID } from './outbox-relay-id'

const logger = createLogger('outbox-relay-do')

const BATCH_SIZE = 50

/**
 * Coalesced outbox processing via Durable Object.
 * UoW calls trigger() → coalesces into one alarm → self-schedules.
 */
class OutboxRelayDOBase extends DurableObject<Env> {
  private readonly deps: AppDeps

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.deps = createAppDeps(env, ctx)
  }

  /** Signal work exists. Multiple calls coalesce into one alarm. */
  async trigger(): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm()

    // Alarm in future = already scheduled, skip
    if (currentAlarm && currentAlarm > Date.now()) {
      return
    }

    // No alarm or stale (in past) = schedule now
    await this.ctx.storage.setAlarm(Date.now())
  }

  /** Flush outbox, self-schedule next run. CF retries on throw. */
  async alarm(): Promise<void> {
    const outboxRelay = this.deps.services.outboxRelay()
    const result = await outboxRelay.flush(BATCH_SIZE)
    if (result.isErr()) {
      // DO alarms retry only when the alarm handler throws.
      throw result.error
    }

    const published = result.unwrap()

    logger.debug('Outbox relay complete', {
      published,
      batchSize: BATCH_SIZE,
    })

    if (published >= BATCH_SIZE) {
      await this.ctx.storage.setAlarm(Date.now())
      logger.debug('More messages pending, scheduling next batch')
    }
  }
}

export const OutboxRelayDO = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  OutboxRelayDOBase,
)
