import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@web/pages/authed/dashboard/dashboard-page'

export const Route = createFileRoute('/_authed/products/$productId/')({
  component: DashboardPage,
})
