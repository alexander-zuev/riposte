export type StripeConnectionCredentials = {
  accessToken: string
  refreshToken: string
}

export type StripeConnection = {
  id: string
  userId: string
  stripeAccountId: string
  livemode: boolean
  scope: string | null
  tokenType: string | null
  accessTokenExpiresAt: Date
  connectedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type StripeConnectionWithCredentials = StripeConnection & StripeConnectionCredentials

export type UpsertStripeConnectionInput = {
  userId: string
  stripeAccountId: string
  livemode: boolean
  scope?: string
  tokenType?: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  connectedAt: Date
}
