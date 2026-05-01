/**
 * Shared Sentry options for all @sentry/cloudflare entrypoints.
 * Used by: web SSR, worker, DOs, Workflows.
 *
 * release: Set via --var SENTRY_RELEASE during deploy. Must match the release
 * used in `sentry-cli sourcemaps upload --release=X` so stack traces resolve.
 */
export function createSentryOptions(env: {
  SENTRY_DSN?: string
  ENV?: string
  SENTRY_RELEASE?: string
}) {
  const environment = env.ENV ?? 'development'
  const isDisabled = environment === 'test' || environment === 'development'

  return {
    dsn: isDisabled ? '' : (env.SENTRY_DSN ?? ''),
    environment,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: environment === 'production' ? 0.25 : 0,
    sendDefaultPii: false,
  }
}
