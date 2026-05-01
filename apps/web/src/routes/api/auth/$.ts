import { createFileRoute } from '@tanstack/react-router'
import { getAuthInstance } from '@worker/infrastructure/auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const auth = getAuthInstance([tanstackStartCookies()])
        return auth.handler(request)
      },
      POST: ({ request }) => {
        const auth = getAuthInstance([tanstackStartCookies()])
        return auth.handler(request)
      },
    },
  },
})
