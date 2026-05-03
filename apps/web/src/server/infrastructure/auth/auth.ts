import type { BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'
import { env } from 'cloudflare:workers'

import { getServerConfig } from '../config'
import { createDatabase } from '../db/connection'
import { createBetterAuthOptions } from './options'
import type { AuthConfig } from './types'

export function getAuthInstance(plugins?: BetterAuthOptions['plugins']) {
  const cfg = getServerConfig()

  const database = drizzleAdapter(createDatabase(env), { provider: 'pg' })

  const config: AuthConfig = {
    mode: cfg.mode,
    baseURL: cfg.appUrl,
    googleClientId: cfg.google.clientId,
    googleClientSecret: cfg.google.clientSecret,
    githubClientId: cfg.github.clientId,
    githubClientSecret: cfg.github.clientSecret,
    turnstileSecretKey: cfg.turnstileSecretKey,
    stripeSecretKey: cfg.stripe.secretKey,
    stripeWebhookSecret: cfg.stripe.webhookSecret,
    kvStorage: cfg.kvStorage,
    rateLimiter: cfg.rateLimiter,
    queue: cfg.queue,
    waitUntil: cfg.waitUntil,
  }

  return betterAuth(createBetterAuthOptions(database, config, plugins))
}
