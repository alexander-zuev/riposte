import { createFileRoute } from '@tanstack/react-router'
import { GeneralPage } from '@web/pages/authed/products/general-page'

export const Route = createFileRoute('/_authed/products/$productId/general')({
  component: RouteComponent,
})

function RouteComponent() {
  const { product } = Route.useRouteContext()
  return <GeneralPage product={product} />
}
