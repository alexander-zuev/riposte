import { createCommand, createProductInputSchema, createQuery, toServerFnRpc } from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'

const createProductFnInputSchema = createProductInputSchema.omit({ userId: true })

export const listProducts = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const query = createQuery('ListProducts', { userId: context.user.id })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const createProduct = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator(createProductFnInputSchema)
  .handler(async ({ data, context }) => {
    const command = createCommand('CreateProduct', {
      userId: context.user.id,
      productName: data.productName,
      url: data.url,
      productType: data.productType,
    })
    const result = await context.deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
