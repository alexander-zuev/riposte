import { unwrapRpc, type RpcResult } from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncDisputesForProduct } from '@web/server/entrypoints/functions/dispute-case.fn'
import { toast } from 'sonner'

type SyncDisputesResult = {
  status: 'completed' | 'pending'
}

export function useSyncDisputesMutation(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<SyncDisputesResult> =>
      unwrapRpc<SyncDisputesResult, unknown>(
        (await syncDisputesForProduct({ data: { productId } })) as RpcResult<
          SyncDisputesResult,
          unknown
        >,
      ),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['disputes', 'list'] })
    },
    onSuccess: (result) => {
      if (result.status === 'pending') {
        toast.info('Sync is still running')
        return
      }
      toast.success('Disputes synced')
    },
    onError: () => {
      toast.error('Failed to start sync')
    },
  })
}
