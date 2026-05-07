import { Outlet, useRouteContext } from '@tanstack/react-router'
import { AppShell } from '@web/pages/authed/layouts/app-shell'

export function AuthedLayout() {
  const { session } = useRouteContext({ from: '/_authed' })

  return (
    <AppShell user={session.user}>
      <Outlet />
    </AppShell>
  )
}
