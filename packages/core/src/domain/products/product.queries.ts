import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { TimestamptzSchema, UserIdSchema } from '../primitives'
import { PRODUCT_STATUSES, PRODUCT_TYPES } from './product.types'

export const productListItemSchema = z.object({
  id: z.uuidv4(),
  productName: z.string(),
  url: z.string(),
  productType: z.enum(PRODUCT_TYPES),
  status: z.enum(PRODUCT_STATUSES),
  createdAt: TimestamptzSchema,
})

export const listProductsSchema = baseQuerySchema.extend({
  name: z.literal('ListProducts'),
  userId: UserIdSchema,
})

export const listProductsResultSchema = z.object({
  items: z.array(productListItemSchema),
})

export type ProductListItem = z.infer<typeof productListItemSchema>
export type ListProducts = z.infer<typeof listProductsSchema>
export type ListProductsResult = z.infer<typeof listProductsResultSchema>
