import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

export const disputeCaseReceivedSchema = baseEventSchema.extend({
  name: z.literal('DisputeCaseReceived'),
  disputeCaseId: z.string().min(1),
})

export type DisputeCaseReceived = z.infer<typeof disputeCaseReceivedSchema>
