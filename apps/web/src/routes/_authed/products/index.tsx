import { createFileRoute } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { ProductsPage } from '@web/pages/authed/products/products-page'

export const Route = createFileRoute('/_authed/products/')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(productQueries.list()),
  component: ProductsPage,
})
