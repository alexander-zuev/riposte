import type { ReadProductDisputeSetupResult } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { productQueries } from '@web/entities/products/product-queries'

/**
 * Playbook page data (dispute playbook + product evidence). Exposes the domain-shaped `data`
 * plus a curated loading/error/refetch surface, so consumers get ready-to-use domain objects and
 * never touch the raw query result.
 */
export type UsePlaybookSetup = {
  data: ReadProductDisputeSetupResult | undefined
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function usePlaybookSetup(productId: string): UsePlaybookSetup {
  const query = useQuery(productQueries.disputeSetup(productId))

  return {
    data: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => {
      query.refetch().catch(() => undefined)
    },
  }
}
