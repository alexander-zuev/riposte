import { createFileRoute } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { NotificationsPage } from '@web/pages/authed/notifications/notifications-page'

export const Route = createFileRoute('/_authed/notifications')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(connectionsQueries.status())
  },
  component: NotificationsPage,
})
