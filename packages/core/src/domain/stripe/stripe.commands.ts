import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'

export const stripeWebhookEventSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    account: z.string().min(1).optional(),
    livemode: z.boolean(),
    data: z
      .object({
        object: z.unknown(),
      })
      .passthrough(),
  })
  .passthrough()

const stripeWebhookCommandBase = baseCommandSchema.extend({
  stripeEvent: stripeWebhookEventSchema,
})

export const handleStripeAppAuthorizedSchema = stripeWebhookCommandBase.extend({
  name: z.literal('HandleStripeAppAuthorized'),
})

export const handleStripeAppDeauthorizedSchema = stripeWebhookCommandBase.extend({
  name: z.literal('HandleStripeAppDeauthorized'),
})

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>
export type HandleStripeAppAuthorized = z.infer<typeof handleStripeAppAuthorizedSchema>
export type HandleStripeAppDeauthorized = z.infer<typeof handleStripeAppDeauthorizedSchema>
