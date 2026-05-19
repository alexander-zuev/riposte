import type { Icon } from '@phosphor-icons/react'
import {
  BellIcon,
  CreditCardIcon,
  GaugeIcon,
  IdentificationCardIcon,
  ListChecksIcon,
  PlugIcon,
  ScrollIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import type { routeTree } from '@web/lib/router/routeTree.gen'

type AppRoutePath = (typeof routeTree)['types']['to']
type ProductScopedRoutePath = Extract<AppRoutePath, `/products/$productId${string}`>
type WorkspaceRoutePath = Extract<AppRoutePath, '/account' | '/billing' | '/notifications'>

interface BaseNavItem<TTo extends AppRoutePath> {
  label: string
  to: TTo
  icon: Icon
  exact?: boolean
  badge?: string
}

export type ProductNavItem = BaseNavItem<ProductScopedRoutePath>
export type WorkspaceNavItem = BaseNavItem<WorkspaceRoutePath>
export type NavItem = ProductNavItem | WorkspaceNavItem

export const productOperationsNavItems: readonly ProductNavItem[] = [
  { label: 'Dashboard', to: '/products/$productI', icon: GaugeIcon, exact: true },
  { label: 'Disputes', to: '/products/$productId/disputes', icon: ListChecksIcon, badge: '3' },
] as const

export const productSetupNavItems: readonly ProductNavItem[] = [
  { label: 'General', to: '/products/$productId/general', icon: IdentificationCardIcon },
  { label: 'Connections', to: '/products/$productId/connections', icon: PlugIcon },
  { label: 'Playbook', to: '/products/$productId/playbook', icon: ScrollIcon },
] as const

export const workspaceNavItems: readonly WorkspaceNavItem[] = [
  { label: 'Account', to: '/account', icon: UserCircleIcon },
  { label: 'Billing', to: '/billing', icon: CreditCardIcon },
  { label: 'Notifications', to: '/notifications', icon: BellIcon },
] as const

export const productScopedNavItems: readonly ProductNavItem[] = [
  ...productOperationsNavItems,
  ...productSetupNavItems,
] as const

export function interpolateProductHref(template: ProductScopedRoutePath, productId: string) {
  return template.replace('$productId', productId)
}

export function isNavItemActive(
  item: Pick<NavItem, 'to' | 'exact'>,
  href: string,
  pathname: string,
) {
  if (item.exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
