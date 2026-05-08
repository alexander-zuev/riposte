import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const getConnectionsStatusSchema = baseQuerySchema.extend({
  name: z.literal('GetConnectionsStatus'),
  userId: UserIdSchema,
})

export type GetConnectionsStatus = z.infer<typeof getConnectionsStatusSchema>
