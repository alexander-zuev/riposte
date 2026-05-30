import { useQuery } from '@tanstack/react-query'
import {
  disputeQueries,
  type ListDisputeCasesOptions,
} from '@web/entities/disputes/dispute-queries'
import { useCallback, useMemo } from 'react'

export function useDisputeListData(productId: string, listInput?: ListDisputeCasesOptions) {
  const disputesQuery = useQuery(disputeQueries.list(productId, listInput))
  const retry = useCallback(() => {
    disputesQuery.refetch().catch(() => undefined)
  }, [disputesQuery])

  return useMemo(
    () => ({
      disputes: disputesQuery.data?.items ?? [],
      isError: disputesQuery.isError,
      isLoading: disputesQuery.isLoading,
      lastSyncedAt: disputesQuery.data?.sync.lastSyncedAt
        ? new Date(disputesQuery.data.sync.lastSyncedAt)
        : null,
      retry,
    }),
    [
      disputesQuery.data?.items,
      disputesQuery.data?.sync.lastSyncedAt,
      disputesQuery.isError,
      disputesQuery.isLoading,
      retry,
    ],
  )
}
