import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'

export const handleStripeWebhookReceivedSchema = baseCommandSchema.extend({
  name: z.literal('HandleStripeWebhookReceived'),
  stripeEvent: z.record(z.string(), z.unknown()),
})

export type HandleStripeWebhookReceived = z.infer<typeof handleStripeWebhookReceivedSchema>
