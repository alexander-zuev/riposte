import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const getChatMessagesSchema = baseQuerySchema.extend({
  name: z.literal('GetChatMessages'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
})

export type GetChatMessages = z.infer<typeof getChatMessagesSchema>
