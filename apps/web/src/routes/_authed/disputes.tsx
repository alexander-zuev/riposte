import { createFileRoute } from '@tanstack/react-router'
import { DisputesPage } from '@web/pages/authed/disputes/disputes-page'

export const Route = createFileRoute('/_authed/disputes')({
  component: DisputesPage,
})
