import { createFileRoute } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { ConnectionsPage } from '@web/pages/authed/connections/connections-page'
import { z } from 'zod'

const connectionsSearchSchema = z.object({
  stripeConnected: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/_authed/products/$productId/connections')({
  validateSearch: connectionsSearchSchema,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(connectionsQueries.status())
  },
  component: ConnectionsPage,
})
