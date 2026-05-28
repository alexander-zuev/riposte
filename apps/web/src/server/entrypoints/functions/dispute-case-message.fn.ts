import {
  createQuery,
  listDisputeCaseActivitySchema,
  listDisputeCaseMessagesSchema,
  toServerFnRpc,
} from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

const listDisputeCaseMessagesInputSchema = listDisputeCaseMessagesSchema.omit({
  type: true,
  name: true,
})

const listDisputeCaseActivityInputSchema = listDisputeCaseActivitySchema.omit({
  type: true,
  name: true,
})

export const listDisputeCaseMessages = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(listDisputeCaseMessagesInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('ListDisputeCaseMessages', data)
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const listDisputeCaseActivity = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(listDisputeCaseActivityInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('ListDisputeCaseActivity', data)
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })
