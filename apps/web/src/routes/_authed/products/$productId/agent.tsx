import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { AgentPage } from '@web/pages/authed/products/agent/agent-page'

export const Route = createFileRoute('/_authed/products/$productId/agent')({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.setup(params.productId)),
  component: RouteComponent,
})

function RouteComponent() {
  const { product } = Route.useRouteContext()
  return <AgentPage product={product} />
}
