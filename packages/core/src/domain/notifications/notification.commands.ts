import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'

export const notificationChannelSchema = z.union([z.literal('email'), z.literal('slack')])

export const handleSlackOAuthCallbackSchema = baseCommandSchema.extend({
  name: z.literal('HandleSlackOAuthCallback'),
  code: z.string().min(1),
  state: z.string().min(1),
})

export const handleSlackAppUninstalledSchema = baseCommandSchema.extend({
  name: z.literal('HandleSlackAppUninstalled'),
  teamId: z.string().min(1),
})

export const setNotificationChannelPreferenceInputSchema = z.object({
  channel: notificationChannelSchema,
  enabled: z.boolean(),
})

export const setNotificationChannelPreferenceSchema = baseCommandSchema.extend({
  name: z.literal('SetNotificationChannelPreference'),
  userId: UserIdSchema,
  ...setNotificationChannelPreferenceInputSchema.shape,
})

export type NotificationChannel = z.infer<typeof notificationChannelSchema>
export type HandleSlackOAuthCallback = z.infer<typeof handleSlackOAuthCallbackSchema>
export type HandleSlackAppUninstalled = z.infer<typeof handleSlackAppUninstalledSchema>
export type SetNotificationChannelPreferenceInput = z.infer<
  typeof setNotificationChannelPreferenceInputSchema
>
export type SetNotificationChannelPreference = z.infer<
  typeof setNotificationChannelPreferenceSchema
>
