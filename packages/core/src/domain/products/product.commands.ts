import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { createProductInputSchema } from './product.dto'

export const createProductSchema = baseCommandSchema
  .extend({ name: z.literal('CreateProduct') })
  .extend(createProductInputSchema.shape)

export const createProductResultSchema = z.object({
  productId: z.uuidv4(),
})

export type CreateProduct = z.infer<typeof createProductSchema>
export type CreateProductResult = z.infer<typeof createProductResultSchema>
