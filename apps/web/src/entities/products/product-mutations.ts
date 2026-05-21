import {
  createProductInputSchema,
  unwrapRpc,
  updateProductFieldsSchema,
} from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { selectedProductQueries } from '@web/entities/products/selected-product-queries'
import { isTaggedErrorWithTag } from '@web/lib/errors'
import {
  createProduct,
  deleteProduct,
  disconnectProductAppDataSource,
  updateProduct,
} from '@web/server/entrypoints/functions/product.fn'
import { setSelectedProductIdServerFn } from '@web/server/entrypoints/functions/selected-product.fn'
import { toast } from 'sonner'
import type { z } from 'zod'

import { productQueries } from './product-queries'

const createProductRequestSchema = createProductInputSchema.omit({ userId: true })

export type CreateProductRequest = z.input<typeof createProductRequestSchema>
export type UpdateProductRequest = z.input<typeof updateProductFieldsSchema>

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

export function useUpdateProductMutation(productId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProductRequest) =>
      unwrapRpc(await updateProduct({ data: { productId, ...input } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productQueries.list().queryKey })
      toast.success('Product updated')
    },
    onError: (error) => {
      if (isTaggedErrorWithTag(error, 'DuplicateProductUrlError')) {
        toast.error(error.message)
        return
      }

      toast.error('Failed to update product')
    },
  })
}

/**
 * Disconnects a merchant MCP source for a product. The DO clears its MCP state
 * and broadcasts the new `MCPServersState` over the WS — so we deliberately
 * do not invalidate any query here. The popover updates via `onMcpUpdate` push
 * (see `useDisputeAgent`).
 */
export function useDisconnectMcpMutation(productId: string) {
  return useMutation({
    mutationFn: async (input: { mcpServerId: string; serverName: string }) =>
      unwrapRpc(
        await disconnectProductAppDataSource({
          data: { productId, mcpServerId: input.mcpServerId },
        }),
      ),
    onSuccess: (_data, variables) => {
      toast.success(`Disconnected ${variables.serverName} MCP server`)
    },
    onError: (_error, variables) => {
      toast.error(`Failed to disconnect ${variables.serverName} MCP server`)
    },
  })
}

export function useDeleteProductMutation(productId: string, productName: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => unwrapRpc(await deleteProduct({ data: { productId } })),
    onSuccess: async () => {
      const selected = queryClient.getQueryData(selectedProductQueries.current().queryKey)
      if (selected === productId) {
        await setSelectedProductIdServerFn({ data: { productId: null } })
        queryClient.setQueryData(selectedProductQueries.current().queryKey, null)
      }
      await queryClient.invalidateQueries({ queryKey: productQueries.list().queryKey })
      toast.success(`Deleted ${productName}`)
      await navigate({ to: '/products' })
    },
    onError: () => {
      toast.error(`Failed to delete ${productName}`)
    },
  })
}
