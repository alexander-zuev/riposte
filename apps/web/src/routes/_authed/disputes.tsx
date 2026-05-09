import { createFileRoute } from '@tanstack/react-router'
import { disputeQueries } from '@web/entities/disputes/dispute-queries'
import { DisputesPage } from '@web/pages/authed/disputes/disputes-page'

export const Route = createFileRoute('/_authed/disputes')({
  loader: ({ context }) => context.queryClient.ensureQueryData(disputeQueries.list()),
  component: DisputesPage,
})
