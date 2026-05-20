import { createCommand, createLogger, toServerFnRpc } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'
import { z } from 'zod'

const logger = createLogger('stripe.fn')

const getStripeOAuthUrlInput = z.object({
  productId: z.uuidv4(),
})

export const getStripeOAuthUrl = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => getStripeOAuthUrlInput.parse(input))
  .handler(async ({ context, data }) => {
    const command = createCommand('BuildStripeOAuthInstallUrl', {
      userId: context.user.id,
      productId: data.productId,
    })
    const result = await context.deps.services.messageBus().handle(command)
    if (result.isErr()) return toServerFnRpc(Result.err(result.error))
    logger.debug('stripe_oauth_url_built', { productId: data.productId, userId: context.user.id })
    return toServerFnRpc(Result.ok(result.value))
  })
