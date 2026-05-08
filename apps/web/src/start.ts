import { sentryGlobalRequestMiddleware } from '@sentry/tanstackstart-react'
import { createStart } from '@tanstack/react-start'
import { withDeps } from '@web/server/infrastructure/middleware/deps.middleware'
import { errorMiddleware } from '@web/server/infrastructure/middleware/error.middleware'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    requestMiddleware: [sentryGlobalRequestMiddleware],
    functionMiddleware: [errorMiddleware, withDeps],
  }
})
