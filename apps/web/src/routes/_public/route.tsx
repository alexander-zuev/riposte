import { createLogger } from '@riposte/core/client'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getSession } from '@web/server/entrypoints/functions/auth.fn'

const logger = createLogger('public-route')

export const Route = createFileRoute('/_public')({
  beforeLoad: async () => {
    try {
      const session = await getSession()
      return { user: session?.user ?? null }
    } catch (e) {
      logger.error('Session check failed', { error: e })
      return { user: null }
    }
  },
  staleTime: 30_000,
  component: PublicRouteComponent,
})

function PublicRouteComponent() {
  return <Outlet />
}
