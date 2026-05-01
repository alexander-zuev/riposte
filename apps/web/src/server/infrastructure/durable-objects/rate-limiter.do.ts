import { createSentryOptions } from '@riposte/core'
import { createLogger } from '@riposte/core/client'
import * as Sentry from '@sentry/cloudflare'
import { DurableObject } from 'cloudflare:workers'

import type { RateLimit } from '../auth/types'

const logger = createLogger('rate-limiter-do')

class RateLimiterDOBase extends DurableObject<Env> {
  async getRateLimit(): Promise<RateLimit | undefined> {
    const data = await this.ctx.storage.get<RateLimit>('data')
    logger.debug('getRateLimit', {
      key: data?.key || 'none',
      count: data?.count || 0,
    })
    return data
  }

  async setRateLimit(value: RateLimit): Promise<void> {
    logger.debug('setRateLimit', {
      key: value.key,
      count: value.count,
      lastRequest: new Date(value.lastRequest).toISOString(),
    })
    await this.ctx.storage.put('data', value)

    const cleanupTime = Date.now() + 60 * 60 * 1000
    await this.ctx.storage.setAlarm(cleanupTime)
  }

  async alarm() {
    await this.ctx.storage.deleteAll()
  }
}

export const RateLimiterDO = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  RateLimiterDOBase,
)
