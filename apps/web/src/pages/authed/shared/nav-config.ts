import type { Icon } from '@phosphor-icons/react'
import {
  BellIcon,
  BrainIcon,
  CreditCardIcon,
  GaugeIcon,
  IdentificationCardIcon,
  ListChecksIcon,
  PlugIcon,
  ScrollIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import type { FileRoutesByTo } from '@web/lib/router/routeTree.gen'

export interface NavItem {
  label: string
  to: keyof FileRoutesByTo
  icon: Icon
  exact?: boolean
  badge?: string
}

export const productOperationsNavItems: readonly NavItem[] = [
  { label: 'Dashboard', to: '/products/$productId', icon: GaugeIcon, exact: true },
  { label: 'Disputes', to: '/products/$productId/disputes', icon: ListChecksIcon, badge: '3' },
  { label: 'Agent', to: '/products/$productId/agent', icon: BrainIcon },
] as const

export const productSetupNavItems: readonly NavItem[] = [
  { label: 'General', to: '/products/$productId/general', icon: IdentificationCardIcon },
  { label: 'Connections', to: '/products/$productId/connections', icon: PlugIcon },
  { label: 'Playbook', to: '/products/$productId/playbook', icon: ScrollIcon },
] as const

export const workspaceNavItems: readonly NavItem[] = [
  { label: 'Account', to: '/account', icon: UserCircleIcon },
  { label: 'Billing', to: '/billing', icon: CreditCardIcon },
  { label: 'Notifications', to: '/notifications', icon: BellIcon },
] as const

export const productScopedNavItems: readonly NavItem[] = [
  ...productOperationsNavItems,
  ...productSetupNavItems,
] as const

export function interpolateProductHref(template: NavItem['to'], productId: string) {
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
