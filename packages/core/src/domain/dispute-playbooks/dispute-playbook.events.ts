import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

export const disputePlaybookCreatedSchema = baseEventSchema.extend({
  name: z.literal('DisputePlaybookCreated'),
  disputePlaybookId: z.uuidv4(),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
  version: z.number().int().positive(),
})

export type DisputePlaybookCreated = z.infer<typeof disputePlaybookCreatedSchema>
