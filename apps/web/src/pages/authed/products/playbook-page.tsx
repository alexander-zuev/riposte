import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { PlaybookView } from '@web/pages/authed/products/playbook-view'

const productRoute = getRouteApi('/_authed/products/$productId')

export function PlaybookPage() {
  const { product } = productRoute.useRouteContext()
  const { productId } = productRoute.useParams()
  const { data } = useSuspenseQuery(productQueries.disputeSetup(productId))

  return <PlaybookView data={data} productId={productId} productName={product.productName} />
}
