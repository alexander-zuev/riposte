import { sentryGlobalRequestMiddleware } from '@sentry/tanstackstart-react'
import { errorMiddleware, loggingMiddleware } from '@server/middleware'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
    requestMiddleware: [sentryGlobalRequestMiddleware],
    functionMiddleware: [errorMiddleware, loggingMiddleware],
  }
})
