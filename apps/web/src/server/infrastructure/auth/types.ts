import type { IQueueClient } from '@server/infrastructure/queues/queue-client'

import type { Mode } from '../config'
import type { auth } from './auth-gen'

/** Inferred from auth-gen instance which includes additionalFields + plugins */
export type AuthSession = (typeof auth)['$Infer']['Session']
export type Session = AuthSession['session']
export type User = AuthSession['user']

export interface RateLimit {
  key: string
  count: number
  lastRequest: number
}

export interface RateLimiterStub {
  getRateLimit: () => Promise<RateLimit | undefined>
  setRateLimit: (value: RateLimit) => Promise<void>
}

/**
 * Auth configuration — everything auth needs from the runtime environment.
 * All fields required. For CLI schema generation, config is omitted entirely (undefined).
 */
export interface AuthConfig {
  mode: Mode
  baseURL: string

  googleClientId: string
  googleClientSecret: string
  githubClientId: string
  githubClientSecret: string

  turnstileSecretKey: string

  stripeSecretKey: string
  stripeWebhookSecret: string

  kvStorage: KVNamespace
  rateLimiter: DurableObjectNamespace
  queueClient: IQueueClient

  waitUntil: (promise: Promise<unknown>) => void
}
