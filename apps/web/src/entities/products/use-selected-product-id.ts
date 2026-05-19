import { useQuery } from '@tanstack/react-query'
import { useMatch } from '@tanstack/react-router'
import { selectedProductQueries } from '@web/entities/products/selected-product-queries'

export function useSelectedProductId(): string | null {
  const productMatch = useMatch({
    from: '/_authed/products/$productId',
    shouldThrow: false,
  })
  const urlProductId = productMatch?.params.productId ?? null

  const { data: storedProductId } = useQuery(selectedProductQueries.current())

  return urlProductId ?? storedProductId ?? null
}
