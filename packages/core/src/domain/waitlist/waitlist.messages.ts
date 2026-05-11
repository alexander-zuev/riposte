import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'

export const joinWaitlistSchema = baseCommandSchema.extend({
  name: z.literal('JoinWaitlist'),
  email: z.email(),
  productType: z.string().optional(),
  usesStripe: z.boolean().optional(),
  hasDisputes: z.string().optional(),
})

export type JoinWaitlist = z.infer<typeof joinWaitlistSchema>
