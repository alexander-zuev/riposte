import { getRouteApi } from '@tanstack/react-router'
import { usePlaybookSetup } from '@web/features/products/use-playbook-setup'
import { PlaybookView } from '@web/pages/authed/products/playbook-view'

const productRoute = getRouteApi('/_authed/products/$productId')

export function PlaybookPage() {
  const { product } = productRoute.useRouteContext()
  const { productId } = productRoute.useParams()
  const { data, isLoading, isError, refetch } = usePlaybookSetup(productId)

  return (
    <PlaybookView
      data={data}
      isLoading={isLoading}
      isError={isError}
      productId={productId}
      productName={product.productName}
      onRetry={refetch}
    />
  )
}
