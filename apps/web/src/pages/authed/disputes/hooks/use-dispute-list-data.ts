import { useQuery } from '@tanstack/react-query'
import { disputeQueries, type ListDisputeCasesInput } from '@web/entities/disputes/dispute-queries'
import { useCallback, useMemo } from 'react'

export function useDisputeListData(listInput: ListDisputeCasesInput) {
  const disputesQuery = useQuery(disputeQueries.list(listInput))
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
