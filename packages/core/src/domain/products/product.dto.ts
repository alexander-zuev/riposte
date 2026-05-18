import { z } from 'zod'

import { PRODUCT_TYPES, SERVICE_START_RULES } from './product.types'

/** Max length per Stripe text evidence field (refund_policy_disclosure, etc.). */
export const STRIPE_EVIDENCE_TEXT_MAX_LENGTH = 20_000

/** Max product display name length (Riposte-defined, UI-friendly). */
export const PRODUCT_NAME_MAX_LENGTH = 200

export const productNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Give this product a name you can find later' })
  .max(PRODUCT_NAME_MAX_LENGTH, {
    error: `Name is too long (max ${PRODUCT_NAME_MAX_LENGTH} characters)`,
  })

const stripeTextSchema = z.string().trim().min(1).max(STRIPE_EVIDENCE_TEXT_MAX_LENGTH)

/** Accepts bare host or absolute URL and stores a canonical https URL. */
export const productUrlSchema = z
  .string()
  .trim()
  .min(1, { error: 'Add a website URL' })
  .transform((value) => {
    if (/^https?:\/\//i.test(value)) return value
    return `https://${value.replace(/^\/\//, '')}`
  })
  .pipe(z.httpUrl({ error: 'Enter a valid website URL' }))
  .transform((value) => {
    const url = new URL(value)
    const canonical = url.toString()
    return url.pathname === '/' && !url.search && !url.hash
      ? canonical.replace(/\/$/, '')
      : canonical
  })

export const productTypeSchema = z
  .enum(PRODUCT_TYPES)
  .refine((value) => value === 'digital_product_or_service', {
    error: 'Riposte currently supports digital products only. More types coming soon',
  })

export const createProductInputSchema = z.object({
  userId: z.uuidv4(),
  productName: productNameSchema,
  url: productUrlSchema,
  productType: productTypeSchema,
})

export type CreateProductInput = z.infer<typeof createProductInputSchema>

export const updateProductInputSchema = z
  .object({
    productName: productNameSchema.optional(),
    url: productUrlSchema.optional(),
    productType: productTypeSchema.optional(),
    productDescription: stripeTextSchema.nullable().optional(),
    serviceStartRule: z.enum(SERVICE_START_RULES).nullable().optional(),
    refundPolicyDisclosure: stripeTextSchema.nullable().optional(),
    cancellationPolicyDisclosure: stripeTextSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'update requires at least one field',
  })

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>
