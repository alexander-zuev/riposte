import { createFileRoute } from '@tanstack/react-router'
import { DisputeDetailPage } from '@web/pages/authed/disputes/dispute-detail-page'

export const Route = createFileRoute('/_authed/disputes/$disputeId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { disputeId } = Route.useParams()

  return <DisputeDetailPage disputeId={disputeId} />
}
