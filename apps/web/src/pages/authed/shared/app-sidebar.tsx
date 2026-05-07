import { useRouterState } from '@tanstack/react-router'
import { isNavItemActive, primaryNavItems } from '@web/pages/authed/shared/nav-config'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@web/ui/components/ui/sidebar'

export function AppSidebar() {
  const pathname = useRouterState().location.pathname

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel>Operate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {primaryNavItems.map((item) => {
                const active = isNavItemActive(item, pathname)
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={
                        <a href={item.href}>
                          <Icon weight="duotone" />
                          <span>{item.label}</span>
                        </a>
                      }
                    />
                    {'badge' in item && item.badge ? (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto" />
      </SidebarContent>

      <SidebarSeparator />
    </Sidebar>
  )
}
