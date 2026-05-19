import type { ProductSetupState } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { productQueries } from '@web/entities/products/product-queries'

export type UseProductSetupResult =
  | { status: 'loading'; state: undefined }
  | { status: 'incomplete'; state: ProductSetupState }
  | { status: 'complete'; state: ProductSetupState }

/**
 * Single read path for `ProductSetupState`. Consumers branch on `status` and
 * receive a narrowed `state` — no `data == null` guards in callers.
 */
export function useProductSetup(productId: string): UseProductSetupResult {
  const { data } = useQuery(productQueries.setup(productId))
  if (!data) return { status: 'loading', state: undefined }
  if (data.currentStep === null) return { status: 'complete', state: data }
  return { status: 'incomplete', state: data }
}
