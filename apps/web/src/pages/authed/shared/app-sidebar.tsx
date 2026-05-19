import { CaretUpDownIcon, PackageIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { ProductIcon } from '@web/entities/products/product-icon'
import { productQueries } from '@web/entities/products/product-queries'
import { useSelectedProductId } from '@web/entities/products/use-selected-product-id'
import {
  interpolateProductHref,
  isNavItemActive,
  productOperationsNavItems,
  productSetupNavItems,
  workspaceNavItems,
  type NavItem,
} from '@web/pages/authed/shared/nav-config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@web/ui/components/ui/sidebar'

export function AppSidebar() {
  const pathname = useRouterState().location.pathname
  const selectedProductId = useSelectedProductId()

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarContent>
        <ProductSwitcher selectedProductId={selectedProductId} />
        <NavGroup
          label="Operations"
          items={productOperationsNavItems}
          productId={selectedProductId}
          pathname={pathname}
        />
        <NavGroup
          label="Setup"
          items={productSetupNavItems}
          productId={selectedProductId}
          pathname={pathname}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-0">
        <NavGroup label="Workspace" items={workspaceNavItems} pathname={pathname} />
      </SidebarFooter>
    </Sidebar>
  )
}

function ProductSwitcher({ selectedProductId }: { selectedProductId: string | null }) {
  const { data } = useQuery(productQueries.list())
  const products = data?.items ?? []
  const current = selectedProductId
    ? products.find((product) => product.id === selectedProductId)
    : undefined
  const triggerLabel = current?.productName ?? 'All products'

  return (
    <SidebarGroup className="pr-2">
      <SidebarGroupContent>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="border border-sidebar-border">
                {current ? (
                  <ProductIcon url={current.url} className="size-4 rounded-xs" />
                ) : (
                  <PackageIcon weight="duotone" />
                )}
                <span className="flex-1 truncate text-left">{triggerLabel}</span>
                <CaretUpDownIcon className="size-4 text-muted-foreground" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {products.map((product) => (
              <DropdownMenuItem
                key={product.id}
                render={
                  <Link
                    to="/products/$productId"
                    params={{ productId: product.id }}
                    className="no-underline hover:no-underline"
                  />
                }
              >
                <ProductIcon url={product.url} className="size-4 rounded-xs" />
                <span className="flex-1 truncate">{product.productName}</span>
              </DropdownMenuItem>
            ))}
            {products.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              render={<Link to="/products" className="no-underline hover:no-underline" />}
            >
              <PackageIcon weight="duotone" className="size-4" />
              All products
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavGroup({
  label,
  items,
  pathname,
  productId,
}: {
  label: string
  items: readonly NavItem[]
  pathname: string
  productId?: string | null
}) {
  return (
    <SidebarGroup className="pr-0">
      <SidebarGroupLabel className="text-system">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const needsProductId = item.to.includes('$productId')
            const href = needsProductId
              ? productId
                ? interpolateProductHref(item.to, productId)
                : null
              : item.to
            const active = href !== null && isNavItemActive(item, href, pathname)
            const disabled = needsProductId && !productId
            const Icon = item.icon

            const linkContent = (
              <>
                <Icon weight="duotone" />
                <span>{item.label}</span>
              </>
            )

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  aria-disabled={disabled || undefined}
                  className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-active:border-r-2 data-active:border-accent"
                  render={
                    disabled ? (
                      <span>{linkContent}</span>
                    ) : needsProductId && productId ? (
                      <Link to={item.to} params={{ productId }}>
                        {linkContent}
                      </Link>
                    ) : (
                      <Link to={item.to}>{linkContent}</Link>
                    )
                  }
                />
                {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
