import type { ListDisputeCases } from '@riposte/core/client'
import { unwrapRpc } from '@riposte/core/client'
import { queryOptions } from '@tanstack/react-query'
import { listDisputeCases } from '@web/server/entrypoints/functions/dispute-case.fn'

export type ListDisputeCasesInput = Omit<ListDisputeCases, 'type' | 'name' | 'userId'>

const defaultListInput = {
  limit: 20,
  sort: { field: 'evidenceDueBy', direction: 'asc' },
} satisfies ListDisputeCasesInput

export const disputeQueries = {
  list: (input: ListDisputeCasesInput = defaultListInput) =>
    queryOptions({
      queryKey: ['disputes', 'list', input] as const,
      queryFn: async () => unwrapRpc(await listDisputeCases({ data: input })),
    }),
}
