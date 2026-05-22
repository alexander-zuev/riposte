import { z } from 'zod'

import { TimestamptzSchema } from '../primitives'
import { PRODUCT_SETUP_STEPS } from './product-setup.types'

/**
 * Per-step completion timestamps. All steps are keys; value is null when the
 * backing artifact does not exist yet. Steps with stubbed artifacts (e.g. app
 * data, dry run for MVP) are always null until those artifacts are implemented.
 */
export const productSetupCompletedAtSchema = z.record(
  z.enum(PRODUCT_SETUP_STEPS),
  TimestamptzSchema.nullable(),
)
export type ProductSetupCompletedAt = z.infer<typeof productSetupCompletedAtSchema>

export const productSetupStateSchema = z.object({
  productId: z.uuidv4(),
  currentStep: z.enum(PRODUCT_SETUP_STEPS).nullable(),
  completedAt: productSetupCompletedAtSchema,
  snapshotAt: TimestamptzSchema,
})
export type ProductSetupState = z.infer<typeof productSetupStateSchema>
