import type { DatabaseError } from '@riposte/core'
import type { IStripeConnectionRepository } from '@server/domain/repository/interfaces'
import { Result } from 'better-result'

import { createConnectionsStatus, type ConnectionsStatus } from './connection-status.types'

export interface IConnectionManager {
  getConnectionsStatus: (userId: string) => Promise<Result<ConnectionsStatus, DatabaseError>>
}

export class ConnectionManager implements IConnectionManager {
  constructor(private readonly stripeConnections: IStripeConnectionRepository) {}

  async getConnectionsStatus(userId: string): Promise<Result<ConnectionsStatus, DatabaseError>> {
    const connection = await this.stripeConnections.findLatestByUserId(userId)
    if (connection.isErr()) return Result.err(connection.error)

    return Result.ok(createConnectionsStatus({ stripeConnection: connection.value }))
  }
}
