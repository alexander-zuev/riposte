import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { disputeQueries } from '@web/entities/disputes/dispute-queries'
import { productQueries } from '@web/entities/products/product-queries'
import { selectedProductQueries } from '@web/entities/products/selected-product-queries'
import { setSelectedProductIdServerFn } from '@web/server/entrypoints/functions/selected-product.fn'

export const Route = createFileRoute('/_authed/products/$productId')({
  beforeLoad: async ({ context, params, cause }) => {
    const { items } = await context.queryClient.ensureQueryData(productQueries.list())
    const product = items.find((item) => item.id === params.productId)
    if (!product) throw notFound()

    // Setup state is not critical path for the dashboard — prefetch warms the cache
    // for SetupBanner / sidebar without blocking page render. The `/agent` route
    // uses `ensureQueryData` instead since setup state IS critical there.
    void context.queryClient.prefetchQuery(productQueries.setup(params.productId))
    void context.queryClient.prefetchQuery(disputeQueries.actionableCount(params.productId))

    if (cause === 'enter') {
      await setSelectedProductIdServerFn({ data: { productId: params.productId } })
      context.queryClient.setQueryData(selectedProductQueries.current().queryKey, params.productId)
    }

    return { product }
  },
  component: Outlet,
})
