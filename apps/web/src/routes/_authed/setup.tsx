import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '@web/pages/authed/setup/setup-page'

export const Route = createFileRoute('/_authed/setup')({
  component: SetupPage,
})
