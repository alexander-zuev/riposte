import { unwrapRpc } from '@riposte/core/client'
import type { CreateProductInput } from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct } from '@web/server/entrypoints/functions/product.fn'

import { productQueries } from './product-queries'

export type CreateProductRequest = Omit<CreateProductInput, 'userId'>

export function useCreateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProductRequest) =>
      unwrapRpc(await createProduct({ data: input })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productQueries.list().queryKey })
    },
  })
}
