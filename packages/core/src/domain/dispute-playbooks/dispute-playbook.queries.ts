import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const readDisputePlaybookSchema = baseQuerySchema.extend({
  name: z.literal('ReadDisputePlaybook'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
})

export type ReadDisputePlaybook = z.infer<typeof readDisputePlaybookSchema>
