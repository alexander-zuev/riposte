import { CaretRightIcon } from '@phosphor-icons/react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import type { AuthUser } from '@web/entities/auth/auth-user'
import { authService } from '@web/lib/auth'
import type { NavItem } from '@web/pages/authed/shared/nav-config'
import { primaryNavItems } from '@web/pages/authed/shared/nav-config'
import { UserDropdown } from '@web/pages/authed/shared/user-dropdown'
import { Logo } from '@web/ui/components/ui/logo'
import { toast } from 'sonner'

const SIDEBAR_HEADER_WIDTH = '16rem'

interface AppHeaderProps {
  user: AuthUser
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter()
  const pathname = useRouterState().location.pathname
  const breadcrumb = getBreadcrumb(pathname)

  const handleSignOut = async () => {
    const result = await authService().signOut()
    if (result.isErr()) {
      toast.error(result.error.message ?? 'Failed to log out. Please try again')
      return
    }

    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <header className="hidden h-14 shrink-0 items-center border-b border-border bg-background md:flex">
      <div
        style={{ width: SIDEBAR_HEADER_WIDTH }}
        className="flex h-full shrink-0 items-center border-r border-sidebar-border px-4"
      >
        <Logo variant="full" size="sm" href="/dashboard" />
      </div>
      <div className="flex flex-1 items-center justify-between gap-4 px-4">
        <div>{breadcrumb ? <Breadcrumb {...breadcrumb} /> : null}</div>
        <UserDropdown user={user} onLogOut={handleSignOut} />
      </div>
    </header>
  )
}

function Breadcrumb({ parent, current }: { parent: NavItem; current: string }) {
  const ParentIcon = parent.icon

  return (
    <nav className="flex min-w-0 items-center gap-2 text-xs">
      <a
        href={parent.href}
        className="flex min-w-0 items-center gap-1.5 text-muted-foreground no-underline hover:text-foreground"
      >
        <ParentIcon className="size-4 shrink-0" weight="duotone" />
        <span className="truncate">{parent.label}</span>
      </a>
      <CaretRightIcon className="size-3 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium text-foreground">{current}</span>
    </nav>
  )
}

function getBreadcrumb(pathname: string) {
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length < 2) return null

  const parentPath = `/${pathParts[0]}`
  const parent = primaryNavItems.find((item) => item.href === parentPath)
  if (!parent) return null

  return {
    parent,
    current: formatSegment(pathParts[pathParts.length - 1] ?? ''),
  }
}

function formatSegment(segment: string) {
  return decodeURIComponent(segment)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
