import type { ListDisputeCases } from '@riposte/core/client'
import { unwrapRpc } from '@riposte/core/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  countActionableDisputeCases,
  listDisputeCases,
} from '@web/server/entrypoints/functions/dispute-case.fn'

export type ListDisputeCasesInput = Omit<ListDisputeCases, 'type' | 'name' | 'userId'>
export type ListDisputeCasesOptions = Omit<ListDisputeCasesInput, 'productId'>

const defaultListInput = {
  limit: 20,
  sort: { field: 'evidenceDueBy', direction: 'asc' },
} satisfies ListDisputeCasesOptions

export const disputeQueries = {
  list: (productId: string, input: ListDisputeCasesOptions = defaultListInput) =>
    queryOptions({
      queryKey: ['disputes', 'list', productId, input] as const,
      queryFn: async () => unwrapRpc(await listDisputeCases({ data: { ...input, productId } })),
      placeholderData: keepPreviousData,
    }),
  actionableCount: (productId: string) =>
    queryOptions({
      queryKey: ['disputes', 'actionable-count', productId] as const,
      queryFn: async () => unwrapRpc(await countActionableDisputeCases({ data: { productId } })),
    }),
}
