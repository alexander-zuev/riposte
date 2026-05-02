import type { DomainMessage } from '@riposte/core'
import { env, waitUntil } from 'cloudflare:workers'

export type Mode = 'development' | 'test' | 'staging' | 'production'

/**
 * Must be called inside a request handler — cloudflare:workers env
 * is not populated during Vite SSR module evaluation.
 */
export function getServerConfig() {
  return {
    mode: env.ENV as Mode,
    appUrl: env.APP_URL as string,

    google: {
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID as string,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
    },

    turnstileSecretKey: env.TURNSTILE_SECRET_KEY!,

    stripe: {
      secretKey: env.STRIPE_SECRET_KEY!,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET!,
    },

    kvStorage: env.AUTH_KV!,
    rateLimiter: env.AUTH_RATE_LIMITER as DurableObjectNamespace,
    queue: env.BACKGROUND_QUEUE as Queue<DomainMessage>,
    waitUntil,
  }
}

export type ServerConfig = ReturnType<typeof getServerConfig>
