import { createFileRoute } from '@tanstack/react-router'
import { AuthUser } from '@web/entities/auth/auth-user'
import { AccountPage } from '@web/pages/authed/account/account-page'

export const Route = createFileRoute('/_authed/account')({
  component: AccountRoute,
})

function AccountRoute() {
  const { session } = Route.useRouteContext()

  return <AccountPage user={new AuthUser(session.user)} />
}
