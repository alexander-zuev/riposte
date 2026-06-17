import { createSentryOptions } from '@riposte/core'
import { createLogger } from '@riposte/core/client'
import * as Sentry from '@sentry/cloudflare'
import { DurableObject } from 'cloudflare:workers'

const logger = createLogger('rate-limiter-do')

/** Per-key rate-limit window state. Owned here: this DO is its storage. */
export interface RateLimit {
  key: string
  count: number
  lastRequest: number
}

class RateLimiterDOBase extends DurableObject<Env> {
  /**
   * Atomic check + increment for one key in a single call.
   * The DO serializes RPC per key, so concurrent requests cannot each pass a
   * stale read before an increment lands. Mirrors Better Auth's `decideConsume`:
   * no data or expired window resets to count 1; at/over `max` blocks with a
   * `retryAfter` (seconds); otherwise increments.
   *
   * `remaining` serves future quota callers; `retryAfter` (null when allowed)
   * satisfies Better Auth's `consume` storage contract.
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number | null }> {
    const existing = await this.ctx.storage.get<RateLimit>('data')
    const now = Date.now()

    if (!existing || now - existing.lastRequest > windowMs) {
      await this.ctx.storage.put('data', { key, count: 1, lastRequest: now })
      await this.ctx.storage.setAlarm(now + 60 * 60 * 1000)
      return { allowed: true, remaining: maxRequests - 1, retryAfter: null }
    }

    if (existing.count >= maxRequests) {
      const retryAfter = Math.ceil((existing.lastRequest + windowMs - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter }
    }

    const newCount = existing.count + 1
    await this.ctx.storage.put('data', { key, count: newCount, lastRequest: now })
    return { allowed: true, remaining: maxRequests - newCount, retryAfter: null }
  }

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

export type RateLimiterDO = InstanceType<typeof RateLimiterDOBase>
export const RateLimiterDO = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  RateLimiterDOBase,
)
