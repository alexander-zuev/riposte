import type { ListDisputeCaseActivity, ListDisputeCaseMessages } from '@riposte/core/client'
import { unwrapRpc } from '@riposte/core/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  listDisputeCaseActivity,
  listDisputeCaseMessages,
} from '@web/server/entrypoints/functions/dispute-case-message.fn'

export type ListDisputeCaseMessagesInput = Omit<ListDisputeCaseMessages, 'type' | 'name'>
export type ListDisputeCaseActivityInput = Omit<ListDisputeCaseActivity, 'type' | 'name'>

export const disputeCaseMessageQueries = {
  activity: (input: ListDisputeCaseActivityInput) =>
    queryOptions({
      queryKey: ['dispute-case-activity', input.productId] as const,
      queryFn: async () => unwrapRpc(await listDisputeCaseActivity({ data: input })),
      placeholderData: keepPreviousData,
    }),
  list: (input: ListDisputeCaseMessagesInput) =>
    queryOptions({
      queryKey: ['dispute-case-messages', input.productId, input.disputeCaseId] as const,
      queryFn: async () => unwrapRpc(await listDisputeCaseMessages({ data: input })),
      placeholderData: keepPreviousData,
    }),
}
