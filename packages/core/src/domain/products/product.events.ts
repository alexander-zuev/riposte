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

export const productAppDataSourceRegisteredSchema = baseEventSchema.extend({
  name: z.literal('ProductAppDataSourceRegistered'),
  productAppDataSourceId: z.uuidv4(),
  productId: z.uuidv4(),
  mcpServerId: z.string().min(1),
  alias: z.string().min(1),
})

export type ProductAppDataSourceRegistered = z.infer<typeof productAppDataSourceRegisteredSchema>

export const productUpdatedSchema = baseEventSchema.extend({
  name: z.literal('ProductUpdated'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
})

export type ProductUpdated = z.infer<typeof productUpdatedSchema>

export const productDeletedSchema = baseEventSchema.extend({
  name: z.literal('ProductDeleted'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
})

export type ProductDeleted = z.infer<typeof productDeletedSchema>

export const productDisabledSchema = baseEventSchema.extend({
  name: z.literal('ProductDisabled'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
})

export type ProductDisabled = z.infer<typeof productDisabledSchema>

export const productEnabledSchema = baseEventSchema.extend({
  name: z.literal('ProductEnabled'),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
})

export type ProductEnabled = z.infer<typeof productEnabledSchema>
