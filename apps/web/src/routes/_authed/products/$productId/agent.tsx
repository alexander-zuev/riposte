import { createFileRoute } from '@tanstack/react-router'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { disputeCaseMessageQueries } from '@web/entities/disputes/dispute-case-message-queries'
import { productQueries } from '@web/entities/products/product-queries'
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
  loader: async ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productQueries.setup(params.productId)),
      context.queryClient.prefetchQuery(chatQueries.messages(params.productId)),
      context.queryClient.prefetchQuery(
        disputeCaseMessageQueries.activity({
          productId: params.productId,
          disputeCaseLimit: 15,
        }),
      ),
    ]),
  component: AgentPage,
})
