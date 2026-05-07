import { useQuery } from '@tanstack/react-query'
import { authQueries } from '@web/entities/auth'

export function useLastLoginMethod() {
  const query = useQuery(authQueries.lastLoginMethod())
  return query.isSuccess ? query.data : null
}
