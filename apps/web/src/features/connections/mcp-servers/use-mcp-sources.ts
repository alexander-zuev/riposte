import { unwrapRpc } from '@riposte/core/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { productQueries } from '@web/entities/products/product-queries'
import { disconnectProductAppDataSource } from '@web/server/entrypoints/functions/product.fn'
import { toast } from 'sonner'

export type McpSource = {
  id: string
  serverName: string
  serverUrl: string
  mcpServerId: string
  createdAt: string
}

export function useMcpSources(productId: string) {
  const queryClient = useQueryClient()
  const snapshotQuery = useQuery(productQueries.setupSnapshot(productId))

  const disconnectMutation = useMutation({
    mutationFn: async (input: { mcpServerId: string; serverName: string }) =>
      unwrapRpc(
        await disconnectProductAppDataSource({
          data: { productId, mcpServerId: input.mcpServerId },
        }),
      ),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: productQueries.setupSnapshot(productId).queryKey,
      })
      await queryClient.invalidateQueries({
        queryKey: productQueries.setup(productId).queryKey,
      })
      toast.success(`Disconnected ${variables.serverName}`)
    },
    onError: (_error, variables) => {
      toast.error(`Failed to disconnect ${variables.serverName}`)
    },
  })

  const sources: McpSource[] = snapshotQuery.data?.appDataSources ?? []

  return {
    sources,
    isLoading: snapshotQuery.isPending,
    disconnect: (source: McpSource) =>
      disconnectMutation.mutate({
        mcpServerId: source.mcpServerId,
        serverName: source.serverName,
      }),
    isDisconnecting: (mcpServerId: string) =>
      disconnectMutation.isPending && disconnectMutation.variables?.mcpServerId === mcpServerId,
  }
}
