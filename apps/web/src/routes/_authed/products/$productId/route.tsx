import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { selectedProductQueries } from '@web/entities/products/selected-product-queries'
import { setSelectedProductIdServerFn } from '@web/server/entrypoints/functions/selected-product.fn'

export const Route = createFileRoute('/_authed/products/$productId')({
  beforeLoad: async ({ context, params, cause }) => {
    const { items } = await context.queryClient.ensureQueryData(productQueries.list())
    const product = items.find((item) => item.id === params.productId)
    if (!product) throw notFound()

    if (cause === 'enter') {
      await setSelectedProductIdServerFn({ data: { productId: params.productId } })
      context.queryClient.setQueryData(selectedProductQueries.current().queryKey, params.productId)
    }

    return { product }
  },
  component: Outlet,
})
