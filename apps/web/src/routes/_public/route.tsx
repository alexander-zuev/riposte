import { fromRpc } from '@riposte/core/client'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_public')({
  beforeLoad: async () => {
    const wire = await getSession()
    const result = fromRpc(wire)
    const session = result.isOk() ? result.value : null
    return { user: session?.user ?? null }
  },
  staleTime: 30_000,
  component: PublicRouteComponent,
})

function PublicRouteComponent() {
  return <Outlet />
}
