import type { AuthUser } from '@web/entities/auth/auth-user'
import { AppHeader } from '@web/pages/authed/shared/app-header'
import { AppSidebar } from '@web/pages/authed/shared/app-sidebar'
import { SidebarShell } from '@web/ui/components/layout/page/sidebar-shell'

interface AppShellProps {
  user: AuthUser
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <SidebarShell header={<AppHeader user={user} />} sidebar={<AppSidebar />}>
      {children}
    </SidebarShell>
  )
}
