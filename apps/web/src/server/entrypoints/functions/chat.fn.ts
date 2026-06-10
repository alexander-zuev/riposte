import { createCommand, createQuery, toServerFnRpc, type DisputeAgentMessage } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Register our chat message as a serializable wire type. `UIMessagePart.input`
// is `unknown` structurally in the SDK, but the runtime payload is JSON because
// the DO stores it through the SDK.
declare module '@tanstack/react-router' {
  interface SerializableExtensions {
    UIMessage: DisputeAgentMessage
  }
}

const getChatMessagesInputSchema = z.object({
  productId: z.uuidv4(),
})

const restartAgentSetupInputSchema = z.object({
  productId: z.uuidv4(),
})

const cancelAgentCompactionInputSchema = z.object({
  productId: z.uuidv4(),
})

export const getChatMessages = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .validator(getChatMessagesInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('GetChatMessages', {
      userId: context.user.id,
      productId: data.productId,
    })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const cancelAgentCompaction = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(cancelAgentCompactionInputSchema)
  .handler(async ({ data, context }) => {
    const result = await context.deps.services.disputeAgentClient().cancelCompaction({
      userId: context.user.id,
      productId: data.productId,
    })

    return toServerFnRpc(result)
  })

export const restartAgentSetup = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(restartAgentSetupInputSchema)
  .handler(async ({ data, context }) => {
    const command = createCommand('RestartProductSetup', {
      userId: context.user.id,
      productId: data.productId,
    })
    const result = await context.deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
