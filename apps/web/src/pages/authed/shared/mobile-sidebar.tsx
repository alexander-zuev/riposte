import { ListIcon, PackageIcon, XIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { useSelectedProductId } from '@web/entities/products/use-selected-product-id'
import { AppSidebar } from '@web/pages/authed/shared/app-sidebar'
import {
  interpolateProductHref,
  isNavItemActive,
  productScopedNavItems,
  workspaceNavItems,
  type NavItem,
} from '@web/pages/authed/shared/nav-config'
import { Button } from '@web/ui/components/ui/button'
import { SidebarProvider } from '@web/ui/components/ui/sidebar'
import { useEffect, useState } from 'react'

function useCurrentSection(): { label: string; icon: NavItem['icon'] } {
  const pathname = useRouterState().location.pathname
  const productId = useSelectedProductId()
  const { data } = useQuery(productQueries.list())
  const product = productId ? data?.items.find((item) => item.id === productId) : undefined

  if (productId) {
    const section = productScopedNavItems.find((item) => {
      const href = interpolateProductHref(item.to, productId)
      return isNavItemActive({ to: item.to, exact: item.exact }, href, pathname)
    })
    if (section) return { label: section.label, icon: section.icon }
    if (product) return { label: product.productName, icon: PackageIcon }
  }

  const workspaceItem = workspaceNavItems.find((item) =>
    isNavItemActive({ to: item.to, exact: item.exact }, item.to, pathname),
  )
  if (workspaceItem) return { label: workspaceItem.label, icon: workspaceItem.icon }

  return { label: 'All products', icon: PackageIcon }
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const { label, icon: CurrentIcon } = useCurrentSection()
  const pathname = useRouterState().location.pathname

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="md:hidden">
      <div className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
        {open ? (
          <>
            <div />
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <XIcon size={16} />
              Close
            </Button>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <CurrentIcon size={18} weight="duotone" className="shrink-0" />
              <span className="truncate">{label}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <ListIcon size={16} />
              Menu
            </Button>
          </>
        )}
      </div>

      {open ? (
        <nav className="fixed inset-x-0 top-12 bottom-0 z-40 bg-background">
          <SidebarProvider
            className="h-full min-h-0"
            style={{ '--sidebar-width': '100%' } as React.CSSProperties}
          >
            <AppSidebar />
          </SidebarProvider>
        </nav>
      ) : null}
    </div>
  )
}
