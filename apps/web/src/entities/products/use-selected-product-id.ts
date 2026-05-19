import { useMatch } from '@tanstack/react-router'

export function useSelectedProductId(): string | null {
  const productMatch = useMatch({
    from: '/_authed/products/$productId',
    shouldThrow: false,
  })
  return productMatch?.params.productId ?? null
}
