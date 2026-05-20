import { createQuery, toServerFnRpc } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'
import type { UIMessage } from 'ai'
import { z } from 'zod'

// Register `UIMessage` as a serializable wire type. We specialize metadata to
// `never` upstream, but `UIMessagePart.input` (dynamic-tool variant) is
// `unknown` *structurally* in the SDK's type — not a generic we can narrow.
// The runtime payload IS JSON (the DO stores it that way via the SDK); this
// declaration teaches the validator that invariant.
declare module '@tanstack/react-router' {
  interface SerializableExtensions {
    UIMessage: UIMessage<never>
  }
}

const getChatMessagesInputSchema = z.object({
  productId: z.uuidv4(),
})

export const getChatMessages = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(getChatMessagesInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('GetChatMessages', {
      userId: context.user.id,
      productId: data.productId,
    })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })
