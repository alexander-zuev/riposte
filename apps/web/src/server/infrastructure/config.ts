import type { DomainMessage } from '@riposte/core'
import { env, waitUntil } from 'cloudflare:workers'

export type Mode = 'development' | 'test' | 'staging' | 'production'

type DevEnv = typeof env & {
  STRIPE_TEST_SECRET_KEY: string
}

type StripeAppEnv = typeof env & {
  STRIPE_APP_SIGNING_SECRET?: string
}

/**
 * Must be called inside a request handler — cloudflare:workers env
 * is not populated during Vite SSR module evaluation.
 */
export function getServerConfig() {
  const mode = env.ENV as Mode
  const baseConfig = {
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

  const stripeConfig = {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    appWebhookSecret: env.STRIPE_APP_WEBHOOK_SECRET,
    appSigningSecret: (env as StripeAppEnv).STRIPE_APP_SIGNING_SECRET,
  }

  if (mode === 'development' || mode === 'test') {
    return {
      ...baseConfig,
      mode,
      stripe: {
        ...stripeConfig,
        testModeSecretKey: (env as DevEnv).STRIPE_TEST_SECRET_KEY,
      },
    }
  }

  return {
    ...baseConfig,
    mode,
    stripe: stripeConfig,
  }
}

export type ServerConfig = ReturnType<typeof getServerConfig>
