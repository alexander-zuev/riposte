import { stripe } from '@better-auth/stripe'
import { createLogger } from '@riposte/core/client'
import type { BetterAuthOptions } from 'better-auth'
import { captcha, lastLoginMethod, magicLink, openAPI } from 'better-auth/plugins'
import Stripe from 'stripe'

import { createDatabaseHooks, createMagicLinkHooks, createStripeCustomerHooks } from './hooks'
import { createRateLimitStorage } from './storage'
import type { AuthConfig } from './types'

const logger = createLogger('auth')

const TRUSTED_ORIGINS: Record<string, string[]> = {
  production: ['https://riposte.sh'],
  staging: ['https://staging.riposte.sh'],
  development: ['http://localhost:3000'],
}

export function createBetterAuthOptions(
  database: NonNullable<BetterAuthOptions['database']>,
  config?: AuthConfig,
  additionalPlugins?: BetterAuthOptions['plugins'],
) {
  const isCliMode = !config

  const databaseHooks = isCliMode ? undefined : createDatabaseHooks(config.queueClient)
  const magicLinkHooks = isCliMode ? undefined : createMagicLinkHooks(config.queueClient)
  const stripeCustomerHooks = isCliMode ? undefined : createStripeCustomerHooks(config.queueClient)
  const kvStorage = isCliMode ? undefined : config.kvStorage
  const rateLimitStorage = isCliMode ? undefined : createRateLimitStorage(config.rateLimiter)

  return {
    appName: 'riposte',
    baseURL: config?.baseURL,
    basePath: '/api/auth',
    database,

    onAPIError: {
      throw: true,
      onError: (error: unknown, ctx: unknown) => {
        const request = (ctx as any).request
        logger.error('auth_operation_failed', {
          error,
          path: request?.url,
          method: request?.method,
        })
      },
    },

    user: {
      additionalFields: {
        stripeCustomerId: {
          type: 'string',
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },

    databaseHooks,

    trustedOrigins: TRUSTED_ORIGINS[config?.mode ?? ''] ?? [],

    advanced: {
      database: {
        generateId: 'uuid',
      },
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
      ...(config && {
        backgroundTasks: { handler: config.waitUntil },
      }),
      ...(config?.mode === 'development' && {
        defaultCookieAttributes: {
          sameSite: 'lax' as const,
          secure: false,
        },
      }),
    },

    secondaryStorage: kvStorage,

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    rateLimit: rateLimitStorage
      ? { enabled: true, customStorage: rateLimitStorage }
      : { enabled: false },

    emailAndPassword: {
      enabled: true,
    },

    socialProviders: {
      google: {
        clientId: config?.googleClientId ?? '',
        clientSecret: config?.googleClientSecret ?? '',
      },
      github: {
        clientId: config?.githubClientId ?? '',
        clientSecret: config?.githubClientSecret ?? '',
      },
    },

    plugins: [
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: config?.turnstileSecretKey ?? '',
      }),

      lastLoginMethod({ storeInDatabase: true }),

      openAPI(),

      magicLink({
        sendMagicLink: magicLinkHooks?.sendMagicLink ?? (async () => {}),
        expiresIn: 300,
      }),

      stripe({
        stripeClient: config
          ? new Stripe(config.stripeSecretKey, {
              httpClient: Stripe.createFetchHttpClient(),
            })
          : ({} as any),
        stripeWebhookSecret: config?.stripeWebhookSecret ?? '',
        createCustomerOnSignUp: !!config,
        onCustomerCreate: stripeCustomerHooks?.onCustomerCreate,
        onEvent: stripeCustomerHooks?.onEvent,
      }),

      ...(additionalPlugins || []),
    ],
  } satisfies BetterAuthOptions
}
