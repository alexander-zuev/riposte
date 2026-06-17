import type { AppDeps } from '@server/infrastructure/app-deps'
import type { BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'

import { createBetterAuthOptions } from './options'
import type { AuthConfig } from './types'

export function getAuthInstance(deps: AppDeps, plugins?: BetterAuthOptions['plugins']) {
  const env = deps.env

  const database = drizzleAdapter(deps.db(), { provider: 'pg' })

  const config: AuthConfig = {
    mode: env.ENV,
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    kvStorage: deps.kv.auth.asSecondaryStorage(),
    rateLimitStorage: deps.services.rateLimiter(),
    queueClient: deps.services.queueClient(),
    waitUntil: (promise) => deps.ctx.waitUntil(promise),
  }

  return betterAuth(createBetterAuthOptions(database, config, plugins))
}
