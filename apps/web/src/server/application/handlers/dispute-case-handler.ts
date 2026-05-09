import type { DatabaseError, ListDisputeCases, ListDisputeCasesResult } from '@riposte/core'
import type { QueryHandler } from '@server/application/registry/types'

export const listDisputeCases: QueryHandler<
  ListDisputeCases,
  ListDisputeCasesResult,
  DatabaseError
> = async (query, ctx) => {
  return await ctx.deps.repos.disputeCases(ctx.deps.db()).listForUser(query)
}
