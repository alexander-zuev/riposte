import type {
  AppendDisputeCaseMessages,
  DatabaseError,
  ListDisputeCaseActivity,
  ListDisputeCaseActivityResult,
  ListDisputeCaseMessages,
  ListDisputeCaseMessagesResult,
} from '@riposte/core'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

export const appendDisputeCaseMessages: CommandHandler<
  AppendDisputeCaseMessages,
  void,
  DatabaseError
> = async (command, ctx) =>
  ctx.deps.repos.disputeCaseMessages(ctx.deps.db()).appendBatch({
    productId: command.productId,
    disputeCaseId: command.disputeCaseId,
    runId: command.runId,
    messages: command.messages,
  })

export const listDisputeCaseMessages: QueryHandler<
  ListDisputeCaseMessages,
  ListDisputeCaseMessagesResult,
  DatabaseError
> = async (query, ctx) => {
  const result = await ctx.deps.repos.disputeCaseMessages(ctx.deps.db()).listMessages(query)
  if (result.isErr()) return Result.err(result.error)
  return Result.ok({ items: result.value })
}

export const listDisputeCaseActivity: QueryHandler<
  ListDisputeCaseActivity,
  ListDisputeCaseActivityResult,
  DatabaseError
> = async (query, ctx) => {
  const result = await ctx.deps.repos.disputeCaseMessages(ctx.deps.db()).listCaseActivity(query)
  if (result.isErr()) return Result.err(result.error)
  return Result.ok({ cases: result.value })
}
