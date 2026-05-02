import { sentryGlobalRequestMiddleware } from '@sentry/tanstackstart-react'
import { createStart } from '@tanstack/react-start'
import { errorMiddleware, loggingMiddleware } from '@web/server/infrastructure/middleware'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    requestMiddleware: [sentryGlobalRequestMiddleware],
    functionMiddleware: [errorMiddleware, loggingMiddleware],
  }
})
