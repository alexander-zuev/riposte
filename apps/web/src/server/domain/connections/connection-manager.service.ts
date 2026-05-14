import type { DatabaseError } from '@riposte/core'
import type {
  INotificationPreferenceRepository,
  ISlackConnectionRepository,
  IStripeConnectionRepository,
} from '@server/domain/repository/interfaces'
import { Result } from 'better-result'

import { createConnectionsStatus, type ConnectionsStatus } from './connection-status.types'

export interface IConnectionManager {
  getConnectionsStatus: (userId: string) => Promise<Result<ConnectionsStatus, DatabaseError>>
}

export class ConnectionManager implements IConnectionManager {
  constructor(
    private readonly stripeConnections: IStripeConnectionRepository,
    private readonly slackConnections: ISlackConnectionRepository,
    private readonly notificationPreferences: INotificationPreferenceRepository,
  ) {}

  async getConnectionsStatus(userId: string): Promise<Result<ConnectionsStatus, DatabaseError>> {
    const stripeConnection = await this.stripeConnections.findLatestByUserId(userId)
    if (stripeConnection.isErr()) return Result.err(stripeConnection.error)

    const slackConnection = await this.slackConnections.findLatestByUserId(userId)
    if (slackConnection.isErr()) return Result.err(slackConnection.error)

    const preferences = await this.notificationPreferences.findForUser(userId)
    if (preferences.isErr()) return Result.err(preferences.error)

    return Result.ok(
      createConnectionsStatus({
        stripeConnection: stripeConnection.value,
        slackConnection: slackConnection.value,
        notificationPreferences: preferences.value,
      }),
    )
  }
}
