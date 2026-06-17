import type { IRateLimiterClient } from '@server/infrastructure/durable-objects/rate-limiter-client'
import type { SecondaryStorage } from '@server/infrastructure/kv/kv-client'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'

import type { Mode } from '../config'
import type { auth } from './auth-gen'

/** Inferred from auth-gen instance which includes additionalFields + plugins */
export type AuthSession = (typeof auth)['$Infer']['Session']
export type Session = AuthSession['session']
export type User = AuthSession['user']

/**
 * Auth configuration — everything auth needs from the runtime environment.
 * All fields required. For CLI schema generation, config is omitted entirely (undefined).
 */
export interface AuthConfig {
  mode: Mode
  baseURL: string
  secret: string

  googleClientId: string
  googleClientSecret: string
  githubClientId: string
  githubClientSecret: string

  turnstileSecretKey: string

  stripeSecretKey: string
  stripeWebhookSecret: string

  kvStorage: SecondaryStorage
  rateLimitStorage: IRateLimiterClient
  queueClient: IQueueClient

  waitUntil: (promise: Promise<unknown>) => void
}
