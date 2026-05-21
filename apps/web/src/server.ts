import { createSentryOptions, type ErrorCaptureEntry, setLoggerErrorHook } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { queue } from '@web/server/entrypoints/queue'
import { scheduled } from '@web/server/entrypoints/scheduled'
import { createAppDeps } from '@web/server/infrastructure/app-deps'
import { waitUntil } from 'cloudflare:workers'
export { InstrumentedDisputeAgent as DisputeAgent } from '@web/server/infrastructure/agents/dispute-agent'
export { InstrumentedDisputeAgentWorkflow as DisputeAgentWorkflow } from '@web/server/infrastructure/workflows/dispute-agent-workflow'
export { OutboxRelayDO, RateLimiterDO } from '@web/server/infrastructure/durable-objects'

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
  fetch(request, _env, _ctx) {
    return serverEntry.fetch(request, { context: {} })
  },
  async queue(batch, env, ctx) {
    return queue(batch, createAppDeps(env, ctx))
  },
  async scheduled(controller, env, ctx) {
    return scheduled(controller, createAppDeps(env, ctx))
  },
}) satisfies ExportedHandler<Env>
