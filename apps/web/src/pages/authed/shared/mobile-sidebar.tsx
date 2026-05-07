import { ListIcon, XIcon } from '@phosphor-icons/react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from '@web/lib/utils'
import { isNavItemActive, primaryNavItems } from '@web/pages/authed/shared/nav-config'
import { Button } from '@web/ui/components/ui/button'
import { useState } from 'react'

function useCurrentPage() {
  const pathname = useRouterState().location.pathname
  return (
    primaryNavItems.find((item) => isNavItemActive(item, pathname)) ?? {
      label: 'Dashboard',
      href: '/dashboard',
      icon: primaryNavItems[0]!.icon,
      exact: true,
    }
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const currentPage = useCurrentPage()
  const CurrentIcon = currentPage.icon
  const pathname = useRouterState().location.pathname

  return (
    <div className="md:hidden">
      <div className="flex h-12 items-center justify-between border-b bg-background px-4">
        {open ? (
          <>
            <div />
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <XIcon size={16} weight="bold" />
              Close
            </Button>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <CurrentIcon size={18} weight="duotone" className="shrink-0 text-accent" />
              <span className="truncate">{currentPage.label}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <ListIcon size={16} weight="bold" />
              Menu
            </Button>
          </>
        )}
      </div>

      {open ? (
        <nav className="fixed inset-x-0 top-12 bottom-0 z-40 flex flex-col overflow-auto bg-background px-4 py-5">
          <div className="flex flex-col gap-1">
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(item, pathname)
              const Icon = item.icon

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center justify-between gap-3 p-2 text-sm no-underline transition-colors',
                    active
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-background-hover hover:text-foreground',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon
                      size={18}
                      weight="duotone"
                      className={active ? 'text-accent' : undefined}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge ? <span className="text-xs tabular-nums">{item.badge}</span> : null}
                </a>
              )
            })}
          </div>
          <div className="mt-auto" />
        </nav>
      ) : null}
    </div>
  )
}
