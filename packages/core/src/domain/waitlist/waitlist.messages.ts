import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'

export const joinWaitlistSchema = baseCommandSchema.extend({
  name: z.literal('JoinWaitlist'),
  email: z.email(),
})

export type JoinWaitlist = z.infer<typeof joinWaitlistSchema>
