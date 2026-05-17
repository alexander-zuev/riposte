import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'
import { PRODUCT_TYPES } from './product.types'

export const productCreatedSchema = baseEventSchema.extend({
  name: z.literal('ProductCreated'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
  productType: z.enum(PRODUCT_TYPES),
})

export type ProductCreated = z.infer<typeof productCreatedSchema>

export const productSetupCompletedSchema = baseEventSchema.extend({
  name: z.literal('ProductSetupCompleted'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
})

export type ProductSetupCompleted = z.infer<typeof productSetupCompletedSchema>
