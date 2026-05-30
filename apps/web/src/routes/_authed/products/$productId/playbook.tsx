import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { PlaybookPage } from '@web/pages/authed/products/playbook-page'

export const Route = createFileRoute('/_authed/products/$productId/playbook')({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.disputeSetup(params.productId)),
  component: PlaybookPage,
})
