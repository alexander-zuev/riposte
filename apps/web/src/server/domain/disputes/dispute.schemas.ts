import { z } from 'zod'

export const stripeDisputeIdSchema = z.string().trim().min(1, 'Stripe dispute ID is required')

export type StripeDisputeId = z.infer<typeof stripeDisputeIdSchema>
