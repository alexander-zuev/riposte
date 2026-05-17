import { z } from 'zod'

import { PRODUCT_TYPES, SERVICE_START_RULES } from './product.types'

/** Max length per Stripe text evidence field (refund_policy_disclosure, etc.). */
export const STRIPE_EVIDENCE_TEXT_MAX_LENGTH = 20_000

/** Max product display name length (Riposte-defined, UI-friendly). */
export const PRODUCT_NAME_MAX_LENGTH = 200

const productNameSchema = z.string().trim().min(1).max(PRODUCT_NAME_MAX_LENGTH)
const stripeTextSchema = z.string().trim().min(1).max(STRIPE_EVIDENCE_TEXT_MAX_LENGTH)

export const createProductInputSchema = z.object({
  userId: z.uuidv4(),
  name: productNameSchema,
  url: z.httpUrl(),
  productType: z.enum(PRODUCT_TYPES),
})

export type CreateProductInput = z.infer<typeof createProductInputSchema>

export const updateProductInputSchema = z
  .object({
    name: productNameSchema.optional(),
    url: z.httpUrl().optional(),
    productType: z.enum(PRODUCT_TYPES).optional(),
    productDescription: stripeTextSchema.nullable().optional(),
    serviceStartRule: z.enum(SERVICE_START_RULES).nullable().optional(),
    refundPolicyDisclosure: stripeTextSchema.nullable().optional(),
    cancellationPolicyDisclosure: stripeTextSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'update requires at least one field',
  })

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>
