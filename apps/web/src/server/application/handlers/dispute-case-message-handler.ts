import type {
  DatabaseError,
  GetDisputeCaseActivity,
  GetDisputeCaseActivityResult,
  ListDisputeCaseActivity,
  ListDisputeCaseActivityResult,
  SaveDisputeCaseMessage,
} from '@riposte/core'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
import { transitionalRepoRead } from '@server/infrastructure/db'
import { Result } from 'better-result'

export const saveDisputeCaseMessage: CommandHandler<
  SaveDisputeCaseMessage,
  void,
  DatabaseError
> = async (command, ctx) =>
  ctx.deps.repos.disputeCaseMessages(ctx.tx).save({
    productId: command.productId,
    disputeCaseId: command.disputeCaseId,
    runId: command.runId,
    message: command.message,
  })

export const getDisputeCaseActivity: QueryHandler<
  GetDisputeCaseActivity,
  GetDisputeCaseActivityResult,
  DatabaseError
> = async (query, ctx) => {
  const result = await ctx.deps.repos
    .disputeCaseMessages(transitionalRepoRead(ctx.deps.readDb()))
    .getCaseMessages(query)
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
  const result = await ctx.deps.repos
    .disputeCaseMessages(transitionalRepoRead(ctx.deps.readDb()))
    .listCaseActivity(query)
  if (result.isErr()) return Result.err(result.error)
  return Result.ok({ cases: result.value })
}
