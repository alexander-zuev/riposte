import { unwrapRpc } from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { connectionsQueries } from '@web/entities/connections'
import { productQueries } from '@web/entities/products/product-queries'
import { restartAgentSetup } from '@web/server/entrypoints/functions/chat.fn'
import { toast } from 'sonner'

type Params = {
  productId: string
}

export function useRestartAgentSetup({ productId }: Params) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => unwrapRpc(await restartAgentSetup({ data: { productId } })),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productQueries.setup(productId).queryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQueries.status().queryKey }),
        queryClient.fetchQuery(chatQueries.messages(productId)),
      ])
      toast.success('Setup restarted')
    },
    onError: () => {
      toast.error('Failed to restart setup')
    },
  })

  return {
    restartSetup: () => mutation.mutate(),
    isRestartingSetup: mutation.isPending,
  }
}
