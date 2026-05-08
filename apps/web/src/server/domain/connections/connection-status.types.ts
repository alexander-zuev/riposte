import type { StripeConnection } from '@server/domain/stripe'

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
      status: 'connected'
      connection: StripeConnection
    }

export type AppDatabaseConnectionState = {
  status: 'not_connected'
}

export type NotificationConnectionState = {
  status: 'not_configured'
}

export type EvidenceToolsConnectionState = {
  status: 'not_defined'
}

export function createConnectionsStatus(input: {
  stripeConnection: StripeConnection | null
}): ConnectionsStatus {
  if (!input.stripeConnection) {
    return {
      stripe: { status: 'not_connected' },
      appDatabase: { status: 'not_connected' },
      notifications: { status: 'not_configured' },
      evidenceTools: { status: 'not_defined' },
    }
  }

  return {
    stripe: {
      status: 'connected',
      connection: input.stripeConnection,
    },
    appDatabase: { status: 'not_connected' },
    notifications: { status: 'not_configured' },
    evidenceTools: { status: 'not_defined' },
  }
}
