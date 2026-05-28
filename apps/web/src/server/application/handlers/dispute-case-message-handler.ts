import type {
  AppendDisputeCaseMessages,
  DatabaseError,
  GetDisputeCaseActivity,
  GetDisputeCaseActivityResult,
  ListDisputeCaseActivity,
  ListDisputeCaseActivityResult,
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

export const getDisputeCaseActivity: QueryHandler<
  GetDisputeCaseActivity,
  GetDisputeCaseActivityResult,
  DatabaseError
> = async (query, ctx) => {
  const result = await ctx.deps.repos.disputeCaseMessages(ctx.deps.db()).getCaseMessages(query)
  if (result.isErr()) return Result.err(result.error)
  const messages = result.value
  const activity = messages.length === 0 ? null : { disputeCaseId: query.disputeCaseId, messages }
  return Result.ok({ activity })
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
