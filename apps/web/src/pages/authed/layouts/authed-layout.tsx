import { Outlet, useRouteContext } from '@tanstack/react-router'
import { AuthUser } from '@web/entities/auth/auth-user'
import { AppShell } from '@web/pages/authed/layouts/app-shell'

export function AuthedLayout() {
  const { session } = useRouteContext({ from: '/_authed' })

  return (
    <AppShell user={new AuthUser(session.user)}>
      <Outlet />
    </AppShell>
  )
}
