import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { PlaybookPage } from '@web/pages/authed/products/playbook-page'
import { PlaybookErrorState, PlaybookPending } from '@web/pages/authed/products/playbook-view'

export const Route = createFileRoute('/_authed/products/$productId/playbook')({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.disputeSetup(params.productId)),
  pendingComponent: PlaybookPending,
  errorComponent: ({ reset }) => <PlaybookErrorState onRetry={reset} />,
  component: PlaybookPage,
})
