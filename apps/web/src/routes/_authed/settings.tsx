import { createFileRoute } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { SettingsPage } from '@web/pages/authed/settings/settings-page'

export const Route = createFileRoute('/_authed/settings')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(connectionsQueries.status())
  },
  component: SettingsPage,
})
