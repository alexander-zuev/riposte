import {
  createCommand,
  createQuery,
  setNotificationChannelPreferenceInputSchema,
  toServerFnRpc,
} from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

export const getConnectionsStatus = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const query = createQuery('GetConnectionsStatus', { userId: context.user.id })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const setNotificationChannelPreference = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator(setNotificationChannelPreferenceInputSchema)
  .handler(async ({ context, data }) => {
    const command = createCommand('SetNotificationChannelPreference', {
      userId: context.user.id,
      channel: data.channel,
      enabled: data.enabled,
    })
    const result = await context.deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
