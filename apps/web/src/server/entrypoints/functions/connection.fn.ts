import { createQuery, toServerFnRpc } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

export const getConnectionsStatus = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const query = createQuery('GetConnectionsStatus', { userId: context.user.id })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })
