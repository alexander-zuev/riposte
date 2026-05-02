import { createSentryOptions, type ErrorCaptureEntry, setLoggerErrorHook } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { queue } from '@web/server/entrypoints/queue'
import { scheduled } from '@web/server/entrypoints/scheduled'
import type { Session, User } from '@web/server/infrastructure/auth/types'
export { OutboxRelayDO, RateLimiterDO } from '@web/server/infrastructure/durable-objects'

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: {
        user?: User
        session?: Session
      }
    }
  }
}

setLoggerErrorHook((entry: ErrorCaptureEntry) => {
  const hint: Parameters<typeof Sentry.captureException>[1] = {
    extra: entry.context,
  }
  if (entry.distinctId) {
    Object.assign(hint, { user: { id: entry.distinctId } })
  }
  Sentry.captureException(entry.error, hint)
})

const serverEntry = createServerEntry(handler)

export default Sentry.withSentry((env: Env) => createSentryOptions(env), {
  fetch(request, _env, _ctx) {
    return serverEntry.fetch(request, { context: {} })
  },
  queue,
  scheduled,
}) satisfies ExportedHandler<Env>
