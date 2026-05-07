import { cn } from '@web/lib/utils'
import { MobileSidebar } from '@web/pages/authed/shared/mobile-sidebar'
import { SidebarInset, SidebarProvider } from '@web/ui/components/ui/sidebar'

interface SidebarShellProps {
  header?: React.ReactNode
  sidebar: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  background?: React.ReactNode
}

export function SidebarShell({
  header,
  sidebar,
  children,
  className,
  noPadding = false,
  background,
}: SidebarShellProps) {
  return (
    <div className={cn('flex h-screen flex-col bg-background', className)}>
      {header}
      <MobileSidebar />
      <SidebarProvider className="min-h-0 flex-1">
        <div className="hidden md:flex">{sidebar}</div>
        <SidebarInset padding={!noPadding} background={background}>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
