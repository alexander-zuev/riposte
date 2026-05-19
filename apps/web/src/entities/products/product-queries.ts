import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import { listProducts } from '@web/server/entrypoints/functions/product.fn'

export const productQueries = {
  list: () =>
    queryOptions({
      queryKey: ['products', 'list'] as const,
      queryFn: async () => unwrapRpc(await listProducts()),
    }),
}
