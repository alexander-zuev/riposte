import { createLogger } from '@riposte/core/client'

import { DurableObjectRpc, type IDurableObjectRpc } from './durable-object-rpc'
import type { RateLimit, RateLimiterDO } from './rate-limiter.do'

const logger = createLogger('rate-limiter-client')

/** One rate-limit rule for a request; `window` is in seconds (Better Auth contract). */
interface RateLimitRule {
  window: number
  max: number
}

/** Better Auth custom rate-limit storage contract. */
export interface IRateLimiterClient {
  get: (key: string) => Promise<RateLimit | undefined>
  set: (key: string, value: RateLimit) => Promise<void>
  consume: (
    key: string,
    rule: RateLimitRule,
  ) => Promise<{ allowed: boolean; retryAfter: number | null }>
}

/**
 * Better Auth rate-limit custom storage, backed by {@link RateLimiterDO}.
 *
 * `consume` is the atomic primitive Better Auth prefers: a single serialized DO
 * call does check + increment, so concurrent requests cannot each pass a stale
 * read before an increment lands. When `consume` is present Better Auth uses it
 * exclusively and skips the legacy non-atomic get→decide→set path — so `get`/`set`
 * remain only to satisfy the storage contract and are effectively unused.
 *
 * All DO calls go through {@link DurableObjectRpc} (transient retry +
 * `DOUnreachableError` normalization), which returns a `Result`. Each method
 * translates an `Err` (exhausted retries) to what Better Auth expects:
 * - `consume` / `get` fail open, so an unreachable DO never 500s the auth request
 * - `set` propagates
 */
export class RateLimiterClient implements IRateLimiterClient {
  constructor(
    private readonly env: Env,
    private readonly rpc: IDurableObjectRpc = new DurableObjectRpc(),
  ) {}

  async get(key: string): Promise<RateLimit | undefined> {
    const result = await this.rpc.call(async () => this.stub(key).getRateLimit())
    if (result.isErr()) {
      // Fail open: Better Auth reads undefined as "no prior usage in this window".
      logger.warn('rate_limit_get_unreachable', { key, error: result.error })
      return undefined
    }
    return result.value
  }

  async set(key: string, value: RateLimit): Promise<void> {
    const result = await this.rpc.call(async () => this.stub(key).setRateLimit(value))
    if (result.isErr()) throw result.error
  }

  async consume(
    key: string,
    rule: RateLimitRule,
  ): Promise<{ allowed: boolean; retryAfter: number | null }> {
    // Single atomic check + increment in the DO (rule.window is seconds).
    const result = await this.rpc.call(async () =>
      this.stub(key).checkRateLimit(key, rule.max, rule.window * 1000),
    )
    if (result.isErr()) {
      // Fail open: an unreachable rate limiter must not 500 the auth request.
      logger.warn('rate_limit_consume_unreachable', { key, error: result.error })
      return { allowed: true, retryAfter: null }
    }
    return { allowed: result.value.allowed, retryAfter: result.value.retryAfter }
  }

  private stub(key: string): DurableObjectStub<RateLimiterDO> {
    return this.env.AUTH_RATE_LIMITER.get(this.env.AUTH_RATE_LIMITER.idFromName(key))
  }
}
