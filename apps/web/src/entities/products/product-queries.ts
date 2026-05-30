import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import {
  getProductSetupState,
  listProducts,
  readProductDisputeSetup,
  readProductSetupSnapshot,
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
  setupSnapshot: (productId: string) =>
    queryOptions({
      queryKey: ['products', 'setup-snapshot', productId] as const,
      queryFn: async () => unwrapRpc(await readProductSetupSnapshot({ data: { productId } })),
    }),
  disputeSetup: (productId: string) =>
    queryOptions({
      queryKey: ['products', 'dispute-setup', productId] as const,
      queryFn: async () => unwrapRpc(await readProductDisputeSetup({ data: { productId } })),
    }),
}
