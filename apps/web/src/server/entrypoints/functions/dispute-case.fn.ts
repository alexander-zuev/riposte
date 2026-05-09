import { createQuery, listDisputeCasesSchema, toServerFnRpc } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

const listDisputeCasesInputSchema = listDisputeCasesSchema.omit({
  type: true,
  name: true,
  userId: true,
})

export const listDisputeCases = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(listDisputeCasesInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('ListDisputeCases', {
      ...data,
      userId: context.user.id,
    })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })
