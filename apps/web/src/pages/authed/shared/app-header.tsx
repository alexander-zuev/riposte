import { CaretRightIcon, PackageIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import type { AuthUser } from '@web/entities/auth/auth-user'
import { useSignOutMutation } from '@web/entities/auth/use-sign-out-mutation'
import { productQueries } from '@web/entities/products/product-queries'
import { useSelectedProductId } from '@web/entities/products/use-selected-product-id'
import type { FileRoutesByTo } from '@web/lib/router/routeTree.gen'
import { productScopedNavItems } from '@web/pages/authed/shared/nav-config'
import { UserDropdown } from '@web/pages/authed/shared/user-dropdown'
import { Logo } from '@web/ui/components/ui/logo'

const SIDEBAR_HEADER_WIDTH = '16rem'

interface AppHeaderProps {
  user: AuthUser
}

export function AppHeader({ user }: AppHeaderProps) {
  const signOutMutation = useSignOutMutation()

  return (
    <header className="hidden h-14 shrink-0 items-center border-b border-border bg-background md:flex">
      <div
        style={{ width: SIDEBAR_HEADER_WIDTH }}
        className="flex h-full shrink-0 items-center border-r border-sidebar-border px-4"
      >
        <Logo variant="full" size="sm" href="/" />
      </div>
      <div className="flex flex-1 items-center gap-4 px-4">
        <Breadcrumb />
        <div className="ml-auto">
          <UserDropdown user={user} onLogOut={() => signOutMutation.mutate()} />
        </div>
      </div>
    </header>
  )
}

function Breadcrumb() {
  const pathname = useRouterState().location.pathname
  const productId = useSelectedProductId()
  const { data } = useQuery(productQueries.list())
  const product = productId ? data?.items.find((item) => item.id === productId) : undefined

  const crumbs = buildCrumbs({ pathname, productId, productName: product?.productName })
  if (crumbs.length === 0) return null

  return (
    <nav className="flex min-w-0 items-center gap-2 text-xs">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        const Icon = crumb.icon

        const content = (
          <span className="flex min-w-0 items-center gap-1.5">
            {Icon ? <Icon className="size-4 shrink-0" weight="duotone" /> : null}
            <span className="truncate">{crumb.label}</span>
          </span>
        )

        return (
          <span key={crumb.key} className="flex min-w-0 items-center gap-2">
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                params={crumb.params}
                className="flex min-w-0 items-center gap-1.5 text-muted-foreground no-underline hover:text-foreground"
              >
                {content}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'flex min-w-0 items-center gap-1.5 font-medium text-foreground'
                    : 'flex min-w-0 items-center gap-1.5 text-muted-foreground'
                }
              >
                {content}
              </span>
            )}
            {!isLast ? <CaretRightIcon className="size-3 shrink-0 text-muted-foreground" /> : null}
          </span>
        )
      })}
    </nav>
  )
}

type AppRoutePath = keyof FileRoutesByTo

interface Crumb {
  key: string
  label: string
  icon?: typeof PackageIcon
  to?: AppRoutePath
  params?: { productId: string }
}

function buildCrumbs({
  pathname,
  productId,
  productName,
}: {
  pathname: string
  productId: string | null
  productName: string | undefined
}): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] !== 'products') return []

  const crumbs: Crumb[] = [
    { key: 'products', label: 'All products', icon: PackageIcon, to: '/products' },
  ]

  if (segments.length === 1) return crumbs

  if (segments[1] === 'new') {
    crumbs.push({ key: 'new', label: 'New product' })
    return crumbs
  }

  if (!productId) return crumbs

  crumbs.push({
    key: 'product',
    label: productName ?? 'Product',
    to: '/products/$productId',
    params: { productId },
  })

  const section = segments[2]
  if (!section) return crumbs

  const sectionTarget = `/products/$productId/${section}`
  const sectionItem = productScopedNavItems.find((item) => item.to === sectionTarget)
  const sectionLabel = sectionItem?.label ?? formatSegment(section)

  crumbs.push({
    key: `section-${section}`,
    label: sectionLabel,
    to: sectionItem?.to,
    params: { productId },
  })

  return crumbs
}

function formatSegment(segment: string) {
  return decodeURIComponent(segment)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
