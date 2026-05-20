import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import { getChatMessages } from '@web/server/entrypoints/functions/chat.fn'

export const chatQueries = {
  /**
   * Per-product chat history — seeds `useAgentChat`. WS is the source of truth
   * after mount, so `staleTime: Infinity` blocks focus/reconnect refetch.
   */
  messages: (productId: string) =>
    queryOptions({
      queryKey: ['chat', 'messages', productId] as const,
      queryFn: async () => unwrapRpc(await getChatMessages({ data: { productId } })),
      staleTime: Infinity,
    }),
}
