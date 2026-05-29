import {
  type DatabaseError,
  type DisputeAgentMessage,
  type DOUnreachableError,
  EntityNotFoundError,
  type GetChatMessages,
} from '@riposte/core'
import type { QueryHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

export const getChatMessages: QueryHandler<
  GetChatMessages,
  DisputeAgentMessage[],
  DatabaseError | EntityNotFoundError | DOUnreachableError
> = async (query, ctx) => {
  const found = await ctx.deps.repos.products(ctx.deps.db()).findById(query.productId)
  if (found.isErr()) return Result.err(found.error)
  // Mismatch returns NotFound — never leak existence of products the caller
  // doesn't own. Matches `productSetup.getState`.
  if (!found.value || found.value.serialize().userId !== query.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: query.productId }))
  }

  return await ctx.deps.services.disputeAgentClient().getMessages({
    userId: query.userId,
    productId: query.productId,
  })
}
