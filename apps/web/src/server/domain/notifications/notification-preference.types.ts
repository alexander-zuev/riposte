import type { NotificationChannel } from '@server/domain/connections'

export type NotificationChannelPreference = {
  userId: string
  channel: NotificationChannel
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export type NotificationRecipient = {
  userId: string
  name: string
  email: string
}

export type SetNotificationChannelPreferenceInput = {
  userId: string
  channel: NotificationChannel
  enabled: boolean
}
