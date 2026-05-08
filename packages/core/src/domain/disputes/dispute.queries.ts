import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'

export const getStripeAppSettingsSchema = baseQuerySchema.extend({
  name: z.literal('GetStripeAppSettings'),
  stripeAccountId: z.string().min(1),
})

export type GetStripeAppSettings = z.infer<typeof getStripeAppSettingsSchema>
