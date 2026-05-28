import { useQuery } from '@tanstack/react-query'
import {
  disputeCaseActivityQueries,
  type ListDisputeCaseActivityInput,
} from '@web/entities/disputes/dispute-case-activity-queries'

export function useDisputeCaseActivity(input: ListDisputeCaseActivityInput) {
  const query = useQuery(disputeCaseActivityQueries.list(input))
  return {
    ...query,
    cases: query.data?.cases ?? [],
  }
}
