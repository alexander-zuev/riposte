import {
  createCommand,
  createProductInputSchema,
  createQuery,
  toServerFnRpc,
  updateProductFieldsSchema,
} from '@riposte/core'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const createProductFnInputSchema = createProductInputSchema.omit({ userId: true })

const getProductSetupStateFnInputSchema = z.object({
  productId: z.uuidv4(),
})

const updateProductFnInputSchema = updateProductFieldsSchema.extend({
  productId: z.uuidv4(),
})

const deleteProductFnInputSchema = z.object({
  productId: z.uuidv4(),
})

export const listProducts = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const query = createQuery('ListProducts', { userId: context.user.id })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const getProductSetupState = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(getProductSetupStateFnInputSchema)
  .handler(async ({ data, context }) => {
    const query = createQuery('GetProductSetupState', {
      userId: context.user.id,
      productId: data.productId,
    })
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

export const updateProduct = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator(updateProductFnInputSchema)
  .handler(async ({ data, context }) => {
    const { productId, ...fields } = data
    const command = createCommand('UpdateProduct', {
      userId: context.user.id,
      productId,
      ...fields,
    })
    const result = await context.deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })

export const deleteProduct = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator(deleteProductFnInputSchema)
  .handler(async ({ data, context }) => {
    const command = createCommand('DeleteProduct', {
      userId: context.user.id,
      productId: data.productId,
    })
    const result = await context.deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
