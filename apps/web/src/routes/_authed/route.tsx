import { fromRpc } from '@riposte/core/client'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ensureSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const wire = await ensureSession()
    const result = fromRpc(wire)

    if (result.isErr()) {
      throw redirect({ to: '/sign-in' })
    }

    return { session: result.value }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return <Outlet />
}
