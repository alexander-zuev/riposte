import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'

export const Route = createFileRoute('/_authed/products/$productId')({
  beforeLoad: async ({ context, params }) => {
    const { items } = await context.queryClient.ensureQueryData(productQueries.list())
    const product = items.find((item) => item.id === params.productId)
    if (!product) throw notFound()
    return { product }
  },
  component: Outlet,
})
