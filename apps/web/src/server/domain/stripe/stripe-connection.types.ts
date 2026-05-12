export type StripeConnectionCredentials = {
  accessToken: string
  refreshToken: string
}

export type StripeConnectionStatus = 'active' | 'revoked'

export type StripeConnection = {
  id: string
  userId: string
  stripeAccountId: string
  stripeBusinessName: string | null
  livemode: boolean
  status: StripeConnectionStatus
  scope: string | null
  tokenType: string | null
  accessTokenExpiresAt: Date
  connectedAt: Date
  revokedAt: Date | null
  revokedStripeEventId: string | null
  createdAt: Date
  updatedAt: Date
}

export type StripeConnectionWithCredentials = StripeConnection & StripeConnectionCredentials

export type UpsertStripeConnectionInput = {
  userId: string
  stripeAccountId: string
  stripeBusinessName: string | null
  livemode: boolean
  scope?: string
  tokenType?: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  connectedAt: Date
}

export type RefreshStripeCredentialsInput = {
  stripeAccountId: string
  accessToken: string
  refreshToken: string
}
