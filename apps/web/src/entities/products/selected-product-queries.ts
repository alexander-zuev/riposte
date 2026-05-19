import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import { getSelectedProductIdServerFn } from '@web/server/entrypoints/functions/selected-product.fn'

export const selectedProductQueries = {
  current: () =>
    queryOptions({
      queryKey: ['selected-product-id'] as const,
      queryFn: async () => unwrapRpc(await getSelectedProductIdServerFn()),
    }),
}
