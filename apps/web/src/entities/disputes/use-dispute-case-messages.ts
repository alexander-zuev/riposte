import type { DisputeCaseMessage } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import {
  disputeCaseMessageQueries,
  type ListDisputeCaseActivityInput,
} from '@web/entities/disputes/dispute-case-message-queries'
import { useMemo } from 'react'

export type DisputeCaseMessageGroup = {
  disputeCaseId: string
  latestCreatedAt: string
  messages: DisputeCaseMessage[]
}

export function useDisputeCaseMessages(input: ListDisputeCaseActivityInput) {
  const query = useQuery(disputeCaseMessageQueries.activity(input))
  const groups = useMemo(
    () =>
      (query.data?.cases ?? []).map((activity) => ({
        disputeCaseId: activity.disputeCaseId,
        latestCreatedAt: activity.latestMessageCreatedAt,
        messages: activity.messages,
      })),
    [query.data],
  )

  return {
    ...query,
    groups,
    items: groups.flatMap((group) => group.messages),
  }
}
