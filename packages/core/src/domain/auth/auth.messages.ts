import { z } from 'zod'

import { baseCommandSchema, baseEventSchema, baseQuerySchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const userSignedUpSchema = baseEventSchema.extend({
  name: z.literal('UserSignedUp'),
  userId: UserIdSchema,
  email: z.email(),
  signupMethod: z.enum(['google', 'github', 'email_password']),
})

export type UserSignedUp = z.infer<typeof userSignedUpSchema>

export const sendWelcomeEmailSchema = baseCommandSchema.extend({
  name: z.literal('SendWelcomeEmail'),
  email: z.email(),
  userName: z.string().optional(),
})

export type SendWelcomeEmail = z.infer<typeof sendWelcomeEmailSchema>

export const getSessionStatusSchema = baseQuerySchema.extend({
  name: z.literal('GetSessionStatus'),
  userId: UserIdSchema,
})

export type GetSessionStatus = z.infer<typeof getSessionStatusSchema>
