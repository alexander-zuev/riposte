import type { UUIDv4 } from '@riposte/core'
import { createEvent } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type { DbStripeConnection } from '@server/infrastructure/db'

export type StripeConnectionCredentials = {
  accessToken: string
  refreshToken: string
}

export type StripeConnectionStatus = 'active' | 'revoked'

export type StripeConnectionSnapshot = {
  id: UUIDv4
  userId: UUIDv4
  productId: UUIDv4
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

export type ConnectStripeConnectionInput = {
  userId: UUIDv4
  productId: UUIDv4
  stripeAccountId: string
  stripeBusinessName: string | null
  livemode: boolean
  scope?: string
  tokenType?: string
  accessTokenExpiresAt: Date
  connectedAt: Date
}

export type RevokeStripeConnectionInput = {
  stripeEventId: string
  revokedAt: Date
  now?: Date
}

export type RefreshStripeConnectionAccessInput = {
  accessTokenExpiresAt: Date
  now?: Date
}

export class StripeConnection extends Entity<StripeConnectionSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly userId: UUIDv4,
    readonly productId: UUIDv4,
    readonly stripeAccountId: string,
    readonly stripeBusinessName: string | null,
    readonly livemode: boolean,
    public status: StripeConnectionStatus,
    readonly scope: string | null,
    readonly tokenType: string | null,
    public accessTokenExpiresAt: Date,
    readonly connectedAt: Date,
    public revokedAt: Date | null,
    public revokedStripeEventId: string | null,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super()
  }

  static connect(input: ConnectStripeConnectionInput, now: Date = new Date()): StripeConnection {
    const connection = new StripeConnection(
      crypto.randomUUID(),
      input.userId,
      input.productId,
      input.stripeAccountId,
      input.stripeBusinessName,
      input.livemode,
      'active',
      input.scope ?? null,
      input.tokenType ?? null,
      input.accessTokenExpiresAt,
      input.connectedAt,
      null,
      null,
      now,
      now,
    )

    connection.addEvent(
      createEvent('StripeConnectionCreated', {
        userId: connection.userId,
        productId: connection.productId,
        stripeAccountId: connection.stripeAccountId,
        livemode: connection.livemode,
      }),
    )

    return connection
  }

  revoke(input: RevokeStripeConnectionInput): void {
    this.status = 'revoked'
    this.revokedAt = input.revokedAt
    this.revokedStripeEventId = input.stripeEventId
    this.updatedAt = input.now ?? new Date()
    this.addEvent(
      createEvent('StripeConnectionRevoked', {
        userId: this.userId,
        productId: this.productId,
        stripeAccountId: this.stripeAccountId,
        livemode: this.livemode,
      }),
    )
  }

  refreshAccessToken(input: RefreshStripeConnectionAccessInput): void {
    this.accessTokenExpiresAt = input.accessTokenExpiresAt
    this.updatedAt = input.now ?? new Date()
    this.addEvent(
      createEvent('StripeConnectionTokenRefreshed', {
        userId: this.userId,
        productId: this.productId,
        stripeAccountId: this.stripeAccountId,
        livemode: this.livemode,
      }),
    )
  }

  // Reconstitutes a persisted Stripe connection.
  // Repository-only path: emits no domain events.
  static deserialize(row: DbStripeConnection): StripeConnection {
    return new StripeConnection(
      row.id,
      row.userId,
      row.productId,
      row.stripeAccountId,
      row.stripeBusinessName,
      row.livemode,
      row.status,
      row.scope,
      row.tokenType,
      row.accessTokenExpiresAt,
      row.connectedAt,
      row.revokedAt,
      row.revokedStripeEventId,
      row.createdAt,
      row.updatedAt,
    )
  }

  static withCredentials(
    connection: StripeConnection,
    credentials: StripeConnectionCredentials,
  ): StripeConnectionWithCredentials {
    return Object.assign(connection, credentials)
  }

  serialize(): StripeConnectionSnapshot {
    return {
      id: this.id,
      userId: this.userId,
      productId: this.productId,
      stripeAccountId: this.stripeAccountId,
      stripeBusinessName: this.stripeBusinessName,
      livemode: this.livemode,
      status: this.status,
      scope: this.scope,
      tokenType: this.tokenType,
      accessTokenExpiresAt: this.accessTokenExpiresAt,
      connectedAt: this.connectedAt,
      revokedAt: this.revokedAt,
      revokedStripeEventId: this.revokedStripeEventId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
