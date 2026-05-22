import { createLogger, unwrapRpc } from '@riposte/core/client'
import { useMutation } from '@tanstack/react-query'
import { cancelAgentCompaction } from '@web/server/entrypoints/functions/chat.fn'

const logger = createLogger('cancel-agent-compaction')

type Params = {
  productId: string
}

export function useCancelAgentCompaction({ productId }: Params) {
  const mutation = useMutation({
    mutationFn: async () => unwrapRpc(await cancelAgentCompaction({ data: { productId } })),
    onError: (error) => {
      logger.warn('cancel_compaction_failed', { error, productId })
    },
  })

  return {
    cancelCompaction: () => mutation.mutate(),
    isCancelingCompaction: mutation.isPending,
  }
}
