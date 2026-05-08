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
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID as string,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },

    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,

    stripe: {
      testModeSecretKey: env.STRIPE_TEST_SECRET_KEY,
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      appWebhookSecret: env.STRIPE_APP_WEBHOOK_SECRET,
    },

    credentialEncryption: {
      currentKeyVersion: env.CURRENT_CREDENTIAL_ENCRYPTION_KEY_VERSION,
      keys: {
        v1: env.CREDENTIAL_ENCRYPTION_KEY_V1,
      },
    },

    resendApiKey: env.RESEND_API_KEY,

    kvStorage: env.AUTH_KV,
    rateLimiter: env.AUTH_RATE_LIMITER as DurableObjectNamespace,
    queue: env.BACKGROUND_QUEUE as Queue<DomainMessage>,
    waitUntil,
  }
}

export type ServerConfig = ReturnType<typeof getServerConfig>
