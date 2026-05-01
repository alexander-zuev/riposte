import { createSentryOptions } from '@riposte/core'
import { setLoggerErrorHook } from '@riposte/core/client'
import * as Sentry from '@sentry/cloudflare'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

// Register logger.error → Sentry hook (shared by all SSR/server function code).
// Without this, handled errors logged via `logger.error({ error })` are invisible
// to Sentry since withSentry only captures thrown/uncaught errors.
setLoggerErrorHook((entry) => {
  Sentry.captureException(entry.error, {
    extra: entry.context,
    ...(entry.distinctId && { user: { id: entry.distinctId } }),
  })
})

const serverEntry = createServerEntry(handler)

export default Sentry.withSentry((env: Env) => createSentryOptions(env), {
  fetch(request, _env, _ctx) {
    return serverEntry.fetch(request)
  },
}) satisfies ExportedHandler<Env>
