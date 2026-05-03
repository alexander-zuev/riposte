import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_public')({
  beforeLoad: async () => {
    try {
      const session = await getSession()
      return { user: session?.user ?? null }
    } catch {
      return { user: null }
    }
  },
  staleTime: 30_000,
  component: PublicRouteComponent,
})

function PublicRouteComponent() {
  return <Outlet />
}
