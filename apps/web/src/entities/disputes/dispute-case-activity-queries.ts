import type { GetDisputeCaseActivity, ListDisputeCaseActivity } from '@riposte/core/client'
import { unwrapRpc } from '@riposte/core/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  getDisputeCaseActivity,
  listDisputeCaseActivity,
} from '@web/server/entrypoints/functions/dispute-case-message.fn'

export type ListDisputeCaseActivityInput = Omit<ListDisputeCaseActivity, 'type' | 'name'>
export type GetDisputeCaseActivityInput = Omit<GetDisputeCaseActivity, 'type' | 'name'>

export const disputeCaseActivityQueries = {
  list: (input: ListDisputeCaseActivityInput) =>
    queryOptions({
      queryKey: ['dispute-case-activity', input.productId] as const,
      queryFn: async () => unwrapRpc(await listDisputeCaseActivity({ data: input })),
      placeholderData: keepPreviousData,
    }),
  detail: (input: GetDisputeCaseActivityInput) =>
    queryOptions({
      queryKey: ['dispute-case-activity', input.productId, input.disputeCaseId] as const,
      queryFn: async () => unwrapRpc(await getDisputeCaseActivity({ data: input })),
      placeholderData: keepPreviousData,
    }),
}
