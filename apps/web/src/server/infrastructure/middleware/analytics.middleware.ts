import {
  createAnalyticsContext,
  POSTHOG_SESSION_ID_HEADER,
} from '@server/infrastructure/analytics/analytics-context'
import { extractAuth, extractAuthFunction } from '@server/infrastructure/middleware/auth.middleware'
import { withDeps, withDepsRequest } from '@server/infrastructure/middleware/deps.middleware'
import { createMiddleware } from '@tanstack/react-start'

export const withAnalyticsFunctionContext = createMiddleware({ type: 'function' })
  .middleware([extractAuthFunction, withDeps])
  .client(async ({ next }) => {
    const { posthog } = await import('posthog-js')
    const posthogSessionId = posthog.get_session_id()

    return next({
      sendContext: {
        analytics: { posthogSessionId },
      },
    })
  })
  .server(async ({ next, context }) => {
    const analytics = createAnalyticsContext({
      distinctId: context?.user?.id,
      posthogSessionId: context?.analytics?.posthogSessionId,
    })
    if (analytics.distinctId || analytics.posthogSessionId) {
      context?.deps?.services.analytics().setContext(analytics)
    }

    return next({
      context: {
        analytics,
      },
    })
  })

export const withAnalyticsRequestDepsContext = createMiddleware({ type: 'request' })
  .middleware([extractAuth, withDepsRequest])
  .server(async ({ context, next, request }) => {
    const analytics = createAnalyticsContext({
      distinctId: context.user?.id,
      posthogSessionId: request.headers.get(POSTHOG_SESSION_ID_HEADER),
    })
    if (analytics.distinctId || analytics.posthogSessionId) {
      context.deps.services.analytics().setContext(analytics)
    }

    return next({ context: { analytics } })
  })
