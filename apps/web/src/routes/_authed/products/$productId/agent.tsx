import { createFileRoute } from '@tanstack/react-router'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { productQueries } from '@web/entities/products/product-queries'
import { AgentPage } from '@web/pages/authed/products/agent/agent-page'

export const Route = createFileRoute('/_authed/products/$productId/agent')({
  // Setup gates render (ensureQueryData rejects → route-level error). Messages
  // are best-effort SSR seed (prefetchQuery swallows errors → in-card retry).
  // Promise.all so SSR latency = max(setup, messages), not sum.
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productQueries.setup(params.productId)),
      context.queryClient.prefetchQuery(chatQueries.messages(params.productId)),
    ]),
  component: RouteComponent,
})

function RouteComponent() {
  const { product } = Route.useRouteContext()
  return <AgentPage product={product} />
}
