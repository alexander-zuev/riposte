import { createSentryOptions, type ErrorCaptureEntry, setLoggerErrorHook } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { queue } from '@web/server/entrypoints/queue'
import { scheduled } from '@web/server/entrypoints/scheduled'
import type { AnalyticsContext } from '@web/server/infrastructure/analytics/analytics-context'
import { createAppDeps, type AppDeps } from '@web/server/infrastructure/app-deps'
import type { Session, User } from '@web/server/infrastructure/auth/types'
import { waitUntil } from 'cloudflare:workers'
export { InstrumentedDisputeAgent as DisputeAgent } from '@web/server/infrastructure/agents/dispute-agent'
export { InstrumentedDisputeAgentWorkflow as DisputeAgentWorkflow } from '@web/server/infrastructure/workflows/dispute-agent-workflow'
export {
  AsyncGateDO,
  OutboxRelayDO,
  RateLimiterDO,
} from '@web/server/infrastructure/durable-objects'

type RequestContext = {
  user?: User
  session?: Session
  analytics?: AnalyticsContext
  deps: AppDeps
}

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: RequestContext
    }
  }
}

setLoggerErrorHook((entry: ErrorCaptureEntry) => {
  waitUntil(
    Promise.resolve(
      Sentry.captureException(entry.error, {
        extra: entry.context,
        ...(entry.distinctId ? { user: { id: entry.distinctId } } : {}),
      }),
    ),
  )
})

const serverEntry = createServerEntry(handler)

export default Sentry.withSentry((env: Env) => createSentryOptions(env), {
  async fetch(request, env, ctx) {
    return serverEntry.fetch(request, { context: { deps: createAppDeps(env, ctx) } })
  },
  async queue(batch, env, ctx) {
    return queue(batch, createAppDeps(env, ctx))
  },
  async scheduled(controller, env, ctx) {
    return scheduled(controller, createAppDeps(env, ctx))
  },
}) satisfies ExportedHandler<Env>
