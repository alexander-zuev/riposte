import { createProductInputSchema, unwrapRpc } from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isTaggedErrorWithTag } from '@web/lib/errors'
import { createProduct } from '@web/server/entrypoints/functions/product.fn'
import { toast } from 'sonner'
import type { z } from 'zod'

import { productQueries } from './product-queries'

const createProductRequestSchema = createProductInputSchema.omit({ userId: true })

export type CreateProductRequest = z.input<typeof createProductRequestSchema>

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (input: CreateProductRequest) =>
      unwrapRpc(await createProduct({ data: input })),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: productQueries.list().queryKey })
      toast.success('Product created')
      await navigate({ to: '/products/$productId', params: { productId: result.productId } })
    },
    onError: (error) => {
      if (isTaggedErrorWithTag(error, 'DuplicateProductUrlError')) {
        toast.error(error.message)
        return
      }

      toast.error('Failed to create product')
    },
  })
}
