import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import {
  getProductSetupState,
  listProducts,
  readDisputePlaybook,
} from '@web/server/entrypoints/functions/product.fn'

export const productQueries = {
  list: () =>
    queryOptions({
      queryKey: ['products', 'list'] as const,
      queryFn: async () => unwrapRpc(await listProducts()),
    }),
  setup: (productId: string) =>
    queryOptions({
      queryKey: ['products', 'setup', productId] as const,
      queryFn: async () => unwrapRpc(await getProductSetupState({ data: { productId } })),
    }),
  playbook: (productId: string) =>
    queryOptions({
      queryKey: ['products', 'playbook', productId] as const,
      queryFn: async () => unwrapRpc(await readDisputePlaybook({ data: { productId } })),
    }),
}
