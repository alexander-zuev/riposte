import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { PlaybookPage } from '@web/pages/authed/products/playbook-page'

export const Route = createFileRoute('/_authed/products/$productId/playbook')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(productQueries.disputeSetup(params.productId))
  },
  component: PlaybookPage,
})
