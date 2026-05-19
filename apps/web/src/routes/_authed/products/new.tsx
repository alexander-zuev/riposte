import { createFileRoute } from '@tanstack/react-router'
import { ProductCreatePage } from '@web/pages/authed/products/product-create-page'

export const Route = createFileRoute('/_authed/products/new')({
  component: ProductCreatePage,
})
