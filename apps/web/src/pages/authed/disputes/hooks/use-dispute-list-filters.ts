import { DISPUTE_CASE_WORKFLOW_STATUSES, type DisputeCaseSort } from '@riposte/core/client'
import type { ListDisputeCasesInput } from '@web/entities/disputes/dispute-queries'
import { useMemo, useState } from 'react'

export type WorkflowStatus = (typeof DISPUTE_CASE_WORKFLOW_STATUSES)[number]

export function useDisputeListFilters() {
  const [selectedStatuses, setSelectedStatuses] = useState<WorkflowStatus[]>([])
  const [sort, setSort] = useState<DisputeCaseSort>({
    field: 'evidenceDueBy',
    direction: 'asc',
  })
  const listInput = useMemo<ListDisputeCasesInput>(
    () => ({
      limit: 20,
      sort,
      filters:
        selectedStatuses.length > 0
          ? {
              statuses: selectedStatuses,
            }
          : undefined,
    }),
    [selectedStatuses, sort],
  )

  return useMemo(
    () => ({
      hasSelectedStatuses: selectedStatuses.length > 0,
      listInput,
      selectedStatuses,
      setSelectedStatuses,
      setSort,
      sort,
    }),
    [listInput, selectedStatuses, sort],
  )
}
