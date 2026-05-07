import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@web/pages/authed/settings/settings-page'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})
