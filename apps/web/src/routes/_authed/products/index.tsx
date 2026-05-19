import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { selectedProductQueries } from '@web/entities/products/selected-product-queries'
import { ProductsPage } from '@web/pages/authed/products/products-page'
import { setSelectedProductIdServerFn } from '@web/server/entrypoints/functions/selected-product.fn'

export const Route = createFileRoute('/_authed/products/')({
  beforeLoad: async ({ context, cause }) => {
    if (cause !== 'enter') return
    await setSelectedProductIdServerFn({ data: { productId: null } })
    context.queryClient.setQueryData(selectedProductQueries.current().queryKey, null)
  },
  loader: async ({ context }) => context.queryClient.ensureQueryData(productQueries.list()),
  component: ProductsPage,
})
