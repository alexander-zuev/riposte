import { sentryGlobalRequestMiddleware } from '@sentry/tanstackstart-react'
import { createStart } from '@tanstack/react-start'
import { withAnalyticsFunctionContext } from '@web/server/infrastructure/middleware/analytics.middleware'
import { csrfMiddleware } from '@web/server/infrastructure/middleware/csrf.middleware'
import { errorMiddleware } from '@web/server/infrastructure/middleware/error.middleware'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    requestMiddleware: [sentryGlobalRequestMiddleware, csrfMiddleware],
    functionMiddleware: [errorMiddleware, withAnalyticsFunctionContext],
  }
})
