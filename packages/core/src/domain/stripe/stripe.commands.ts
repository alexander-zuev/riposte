import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const stripeWebhookEventSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    account: z.string().min(1).optional(),
    livemode: z.boolean(),
    data: z
      .object({
        object: z.unknown(),
      })
      .loose(),
  })
  .loose()

const stripeWebhookCommandBase = baseCommandSchema.extend({
  stripeEvent: stripeWebhookEventSchema,
})

export const handleStripeAppAuthorizedSchema = stripeWebhookCommandBase.extend({
  name: z.literal('HandleStripeAppAuthorized'),
})

export const handleStripeAppDeauthorizedSchema = stripeWebhookCommandBase.extend({
  name: z.literal('HandleStripeAppDeauthorized'),
})

export const handleStripeOAuthCallbackSchema = baseCommandSchema.extend({
  name: z.literal('HandleStripeOAuthCallback'),
  code: z.string().min(1),
  state: z.string().min(1).optional(),
})

export const buildStripeOAuthInstallUrlSchema = baseCommandSchema.extend({
  name: z.literal('BuildStripeOAuthInstallUrl'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
  redirectAfter: z.string().startsWith('/').optional(),
})

export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>
export type HandleStripeAppAuthorized = z.infer<typeof handleStripeAppAuthorizedSchema>
export type HandleStripeAppDeauthorized = z.infer<typeof handleStripeAppDeauthorizedSchema>
export type HandleStripeOAuthCallback = z.infer<typeof handleStripeOAuthCallbackSchema>
export type BuildStripeOAuthInstallUrl = z.infer<typeof buildStripeOAuthInstallUrlSchema>
