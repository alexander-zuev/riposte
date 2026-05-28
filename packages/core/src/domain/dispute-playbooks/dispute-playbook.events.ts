import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

export const disputePlaybookCreatedSchema = baseEventSchema.extend({
  name: z.literal('DisputePlaybookCreated'),
  disputePlaybookId: z.uuidv4(),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
  revision: z.number().int().positive(),
})

export type DisputePlaybookCreated = z.infer<typeof disputePlaybookCreatedSchema>

export const disputePlaybookRevisedSchema = baseEventSchema.extend({
  name: z.literal('DisputePlaybookRevised'),
  disputePlaybookId: z.uuidv4(),
  productId: z.uuidv4(),
  userId: z.uuidv4(),
  revision: z.number().int().positive(),
})

export type DisputePlaybookRevised = z.infer<typeof disputePlaybookRevisedSchema>
