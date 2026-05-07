import type { User } from '@server/infrastructure/auth/types'
import { AppHeader } from '@web/pages/authed/shared/app-header'
import { AppSidebar } from '@web/pages/authed/shared/app-sidebar'
import { MobileSidebar } from '@web/pages/authed/shared/mobile-sidebar'
import { SidebarInset, SidebarProvider } from '@web/ui/components/ui/sidebar'

interface AppShellProps {
  user: User
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader user={user} />
      <MobileSidebar />
      <SidebarProvider className="min-h-0 flex-1">
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </div>
  )
}
