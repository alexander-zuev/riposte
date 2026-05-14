import type { StripeConnection } from '@server/domain/stripe'

export type ConnectionHealth = 'connected' | 'not_connected' | 'failed'
export type NotificationChannel = 'email' | 'slack'

export type NotificationPreference = {
  channel: NotificationChannel
  enabled: boolean
}

export type SlackNotificationConnection = {
  id: string
  userId: string
  teamId: string
  teamName: string | null
  channelId: string | null
  channelName: string | null
  status: 'active' | 'failed'
  failureReason: string | null
  connectedAt: Date
  failedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ConnectionsStatus = {
  stripe: StripeConnectionState
  appDatabase: AppDatabaseConnectionState
  notifications: NotificationConnectionState
  evidenceTools: EvidenceToolsConnectionState
}

export type StripeConnectionState =
  | {
      status: 'not_connected'
    }
  | {
      status: 'revoked'
      connection: StripeConnection
    }
  | {
      status: 'connected'
      connection: StripeConnection
    }

export type AppDatabaseConnectionState = {
  status: 'not_connected'
}

export type NotificationChannelConnection = {
  channel: NotificationChannel
  health: ConnectionHealth
  enabled: boolean
  label: string
  detail: string | null
  failureReason: string | null
}

export type NotificationConnectionState = {
  channels: NotificationChannelConnection[]
}

export type EvidenceToolsConnectionState = {
  status: 'not_defined'
}

export function createConnectionsStatus(input: {
  stripeConnection: StripeConnection | null
  notificationPreferences?: NotificationPreference[]
  slackConnection?: SlackNotificationConnection | null
}): ConnectionsStatus {
  const notifications = createNotificationConnectionState({
    preferences: input.notificationPreferences ?? [],
    slackConnection: input.slackConnection ?? null,
  })

  if (!input.stripeConnection) {
    return {
      stripe: { status: 'not_connected' },
      appDatabase: { status: 'not_connected' },
      notifications,
      evidenceTools: { status: 'not_defined' },
    }
  }

  return {
    stripe: {
      status: input.stripeConnection.status === 'revoked' ? 'revoked' : 'connected',
      connection: input.stripeConnection,
    },
    appDatabase: { status: 'not_connected' },
    notifications,
    evidenceTools: { status: 'not_defined' },
  }
}

export function createNotificationConnectionState(input: {
  preferences: NotificationPreference[]
  slackConnection: SlackNotificationConnection | null
}): NotificationConnectionState {
  const enabledByChannel = new Map<NotificationChannel, boolean>(
    input.preferences.map((preference) => [preference.channel, preference.enabled]),
  )

  return {
    channels: [
      {
        channel: 'email',
        health: 'connected',
        enabled: enabledByChannel.get('email') ?? true,
        label: 'Email',
        detail: 'Account email',
        failureReason: null,
      },
      createSlackNotificationConnection(input.slackConnection, enabledByChannel.get('slack')),
    ],
  }
}

function createSlackNotificationConnection(
  connection: SlackNotificationConnection | null,
  enabled: boolean | undefined,
): NotificationChannelConnection {
  if (!connection) {
    return {
      channel: 'slack',
      health: 'not_connected',
      enabled: false,
      label: 'Slack',
      detail: null,
      failureReason: null,
    }
  }

  const health = connection.status === 'failed' ? 'failed' : 'connected'

  return {
    channel: 'slack',
    health,
    enabled: enabled ?? health === 'connected',
    label: 'Slack',
    detail: formatSlackDetail(connection),
    failureReason: connection.failureReason,
  }
}

function formatSlackDetail(connection: SlackNotificationConnection): string | null {
  const workspace = connection.teamName ?? connection.teamId
  const channel = connection.channelName ?? connection.channelId

  if (!channel) return workspace
  return `${workspace} / ${channel.startsWith('#') ? channel : `#${channel}`}`
}
