import type { DatabaseError, ListDisputeCases, ListDisputeCasesResult } from '@riposte/core'
import type { QueryHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

export const listDisputeCases: QueryHandler<
  ListDisputeCases,
  ListDisputeCasesResult,
  DatabaseError
> = async (query, ctx) => {
  const page = await ctx.deps.repos.disputeCases(ctx.deps.db()).listForUser(query)
  if (page.isErr()) return Result.err(page.error)

  const sync = await ctx.deps.repos.stripeDisputeSyncState(ctx.deps.db()).findForUser(query.userId)
  if (sync.isErr()) return Result.err(sync.error)

  return Result.ok({
    items: page.value.items,
    nextCursor: page.value.nextCursor,
    sync: sync.value,
  })
}
