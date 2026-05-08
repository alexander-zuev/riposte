import { queryOptions } from '@tanstack/react-query'
import { getLastLoginMethod } from '@web/server/entrypoints/functions/auth.fn'

export const authQueries = {
  lastLoginMethod: () =>
    queryOptions({
      queryKey: ['auth', 'last-login-method'] as const,
      queryFn: async () => getLastLoginMethod(),
      retry: false,
    }),
}
