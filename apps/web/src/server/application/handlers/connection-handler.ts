import type { DatabaseError, GetConnectionsStatus } from '@riposte/core'
import type { QueryHandler } from '@server/application/registry/types'
import type { ConnectionsStatus } from '@server/domain/connections'

export const getConnectionsStatus: QueryHandler<
  GetConnectionsStatus,
  ConnectionsStatus,
  DatabaseError
> = async (query, ctx) => {
  return await ctx.deps.services.connectionManager().getConnectionsStatus(query.userId)
}
