export type SlackConnectionStatus = 'active' | 'failed'

export type SlackIncomingWebhookCredentials = {
  webhookUrl: string
}

export type SlackConnection = {
  id: string
  userId: string
  teamId: string
  teamName: string | null
  channelId: string | null
  channelName: string | null
  status: SlackConnectionStatus
  failureReason: string | null
  connectedAt: Date
  failedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SlackConnectionWithCredentials = SlackConnection & SlackIncomingWebhookCredentials

export type UpsertSlackConnectionInput = {
  userId: string
  teamId: string
  teamName: string | null
  channelId: string | null
  channelName: string | null
  webhookUrl: string
  connectedAt: Date
}
