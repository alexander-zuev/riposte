import { z, ZodError } from 'zod'

const envSchema = z.object({
  MODE: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  VITE_APP_URL: z.url(),
  VITE_SENTRY_DSN: z.string(),
  VITE_PUBLIC_POSTHOG_KEY: z.string(),
})

function parseEnv() {
  try {
    return envSchema.parse(import.meta.env)
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      console.error('Settings validation failed:', messages)
      console.error('Current env:', JSON.stringify(import.meta.env, null, 2))
      throw new Error(`Configuration Error: ${messages}`, { cause: error })
    }
    console.error('Settings initialization failed:', error)
    throw error
  }
}

const env = parseEnv()

export const settings = {
  mode: env.MODE,
  isDevelopment: env.MODE === 'development',
  isStaging: env.MODE === 'staging',
  isProduction: env.MODE === 'production',

  appUrl: env.VITE_APP_URL,

  sentry: {
    dsn: env.VITE_SENTRY_DSN,
    environment: env.MODE,
    enabled: env.MODE !== 'development',
    sampleRate: env.MODE === 'development' ? 0 : 0.85,
    tracesSampleRate: env.MODE === 'development' ? 0 : 0.25,
    profilesSampleRate: 0.8,
  },

  posthog: {
    apiKey: env.VITE_PUBLIC_POSTHOG_KEY,
    apiHost: '/api/relay',
    uiHost: 'https://us.posthog.com',
    enabled: env.MODE !== 'development',
  },
}
