import { getAuthInstance } from '@server/infrastructure/auth/auth'
import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    middleware: [routeErrorMiddleware],
    handlers: {
      GET: async ({ request }) => {
        const auth = getAuthInstance([tanstackStartCookies()])
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        const auth = getAuthInstance([tanstackStartCookies()])
        return auth.handler(request)
      },
    },
  },
})
