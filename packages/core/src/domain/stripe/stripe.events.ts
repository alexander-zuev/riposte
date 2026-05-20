import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

/** Emitted after a Stripe connection is persisted; consumed by the agent to nudge the chat forward. */
export const stripeConnectionCreatedSchema = baseEventSchema.extend({
  name: z.literal('StripeConnectionCreated'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
  stripeAccountId: z.string().min(1),
  livemode: z.boolean(),
})

export type StripeConnectionCreated = z.infer<typeof stripeConnectionCreatedSchema>
