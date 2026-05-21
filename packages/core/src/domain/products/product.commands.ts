import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'
import { createProductInputSchema, updateProductFieldsSchema } from './product.dto'

export const createProductSchema = baseCommandSchema
  .extend({ name: z.literal('CreateProduct') })
  .extend(createProductInputSchema.shape)

export const createProductResultSchema = z.object({
  productId: z.uuidv4(),
})

export type CreateProduct = z.infer<typeof createProductSchema>
export type CreateProductResult = z.infer<typeof createProductResultSchema>

export const registerProductAppDataSourceSchema = baseCommandSchema.extend({
  name: z.literal('RegisterProductAppDataSource'),
  productId: z.uuidv4(),
  mcpServerId: z.string().min(1),
  alias: z.string().min(1),
})

export const registerProductAppDataSourceResultSchema = z.object({
  productAppDataSourceId: z.uuidv4(),
})

export type RegisterProductAppDataSource = z.infer<typeof registerProductAppDataSourceSchema>
export type RegisterProductAppDataSourceResult = z.infer<
  typeof registerProductAppDataSourceResultSchema
>

// TODO(review): revisit UpdateProduct shape. Currently accepts every updatable
// field as optional via updateProductFieldsSchema.shape; once onboarding stops
// writing through update we may want narrower, intent-specific commands.
export const updateProductSchema = baseCommandSchema
  .extend({
    name: z.literal('UpdateProduct'),
    userId: UserIdSchema,
    productId: z.uuidv4(),
  })
  .extend(updateProductFieldsSchema.shape)

export const updateProductResultSchema = z.object({
  productId: z.uuidv4(),
})

export type UpdateProduct = z.infer<typeof updateProductSchema>
export type UpdateProductResult = z.infer<typeof updateProductResultSchema>

export const deleteProductSchema = baseCommandSchema.extend({
  name: z.literal('DeleteProduct'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
})

export const deleteProductResultSchema = z.object({
  productId: z.uuidv4(),
})

export type DeleteProduct = z.infer<typeof deleteProductSchema>
export type DeleteProductResult = z.infer<typeof deleteProductResultSchema>
