import { setLoggerErrorHook } from '@riposte/core/client'
import * as Sentry from '@sentry/tanstackstart-react'
import type { AnyRouter } from '@tanstack/react-router'
import { settings } from '@web/lib/env/env'

// Register logger.error -> Sentry hook (client-side)
if (typeof window !== 'undefined') {
  setLoggerErrorHook((entry) => {
    const error =
      entry.error instanceof Error
        ? entry.error
        : new Error(`Non-Error object logged: ${JSON.stringify(entry.error)}`)
    Sentry.captureException(error, { extra: entry.context })
  })
}

// Initialize Sentry with router instance (called from client.tsx)
export function initializeSentry(router: AnyRouter) {
  if (!settings.sentry.enabled) return

  Sentry.init({
    dsn: settings.sentry.dsn,
    environment: settings.sentry.environment,
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    sampleRate: settings.sentry.sampleRate,
    tracesSampleRate: settings.sentry.tracesSampleRate,
    tracePropagationTargets: [
      'localhost',
      '127.0.0.1:3000',
      /^https:\/\/riposte\.sh$/,
      /^https:\/\/.*\.riposte\.sh$/,
    ],
    profilesSampleRate: settings.sentry.profilesSampleRate,
    sendDefaultPii: false,
  })
}

export const ErrorBoundary = Sentry.ErrorBoundary
export { Sentry }
