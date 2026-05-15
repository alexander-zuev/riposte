import { unwrapRpc } from '@riposte/core/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { getConnectionsStatus } from '@web/server/entrypoints/functions/connection.fn'

export const connectionsQueries = {
  status: () =>
    queryOptions({
      queryKey: ['connections', 'status'] as const,
      queryFn: async () => unwrapRpc(await getConnectionsStatus()),
      placeholderData: keepPreviousData,
    }),
}
