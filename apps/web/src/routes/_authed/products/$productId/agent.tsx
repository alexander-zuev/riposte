import { createFileRoute } from '@tanstack/react-router'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { productQueries } from '@web/entities/products/product-queries'
import { useStripeConnectedToast } from '@web/features/agent/hooks/use-stripe-connected-toast'
import { AgentPage } from '@web/pages/authed/products/agent/agent-page'
import { z } from 'zod'

const agentSearchSchema = z.object({
  stripeConnected: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/_authed/products/$productId/agent')({
  validateSearch: agentSearchSchema,
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
  const { productId } = Route.useParams()
  useStripeConnectedToast(productId)
  return <AgentPage product={product} />
}
