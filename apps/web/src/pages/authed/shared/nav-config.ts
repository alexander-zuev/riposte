import type { Icon } from '@phosphor-icons/react'
import { GaugeIcon, GearSixIcon, ListChecksIcon } from '@phosphor-icons/react'

export interface NavItem {
  label: string
  href: string
  icon: Icon
  exact?: boolean
  badge?: string
}

export const primaryNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: GaugeIcon, exact: true },
  { label: 'Disputes', href: '/disputes', icon: ListChecksIcon, badge: '3' },
  { label: 'Settings', href: '/settings', icon: GearSixIcon },
] satisfies NavItem[]

export function isNavItemActive(item: Pick<NavItem, 'href' | 'exact'>, pathname: string) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
