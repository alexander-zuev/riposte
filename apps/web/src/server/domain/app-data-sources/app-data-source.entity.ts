import {
  createEvent,
  type McpConnectionState,
  type ProductAppDataSourceStatus,
  type UUIDv4,
} from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type { DbProductAppDataSource } from '@server/infrastructure/db'

export type ProductAppDataSourceSnapshot = {
  id: UUIDv4
  productId: UUIDv4
  mcpServerId: string
  serverName: string
  serverUrl: string
  status: ProductAppDataSourceStatus
  createdAt: Date
}

export type CreateProductAppDataSourceInput = {
  productId: UUIDv4
  mcpServerId: string
  serverName: string
  serverUrl: string
}

export class ProductAppDataSource extends Entity<ProductAppDataSourceSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly productId: UUIDv4,
    readonly mcpServerId: string,
    readonly serverName: string,
    readonly serverUrl: string,
    private status: ProductAppDataSourceStatus,
    readonly createdAt: Date,
  ) {
    super()
  }

  static create(
    input: CreateProductAppDataSourceInput,
    now: Date = new Date(),
  ): ProductAppDataSource {
    // Registration only happens after the MCP server reaches `ready`, so a new
    // source is born connected.
    const source = new ProductAppDataSource(
      crypto.randomUUID() as UUIDv4,
      input.productId,
      input.mcpServerId,
      input.serverName,
      input.serverUrl,
      'connected',
      now,
    )

    source.addEvent(
      createEvent('ProductAppDataSourceRegistered', {
        productAppDataSourceId: source.id,
        productId: source.productId,
        mcpServerId: source.mcpServerId,
        serverName: source.serverName,
        serverUrl: source.serverUrl,
      }),
    )

    return source
  }

  static deserialize(row: DbProductAppDataSource): ProductAppDataSource {
    return new ProductAppDataSource(
      row.id,
      row.productId,
      row.mcpServerId,
      row.serverName,
      row.serverUrl,
      row.status,
      row.createdAt,
    )
  }

  serialize(): ProductAppDataSourceSnapshot {
    return {
      id: this.id,
      productId: this.productId,
      mcpServerId: this.mcpServerId,
      serverName: this.serverName,
      serverUrl: this.serverUrl,
      status: this.status,
      createdAt: this.createdAt,
    }
  }

  /**
   * Reconciles this source against the observed MCP server state. The domain owns
   * the interpretation: `ready` confirms a live source, `failed` an involuntary
   * loss, everything else is transient and not a settled fact. Transitions (and
   * the events they raise) only fire when the status actually changes — a no-op
   * otherwise, so redelivered or repeated reconciles never emit false events.
   */
  reconcile(serverState: McpConnectionState): void {
    if (serverState === 'ready' && this.status === 'disconnected') {
      this.markReconnected()
      return
    }
    if (serverState === 'failed' && this.status === 'connected') {
      this.markConnectionLost()
    }
    // transient states (connecting/authenticating/connected/discovering), or an
    // observation that matches the current status, are a no-op.
  }

  /** User-initiated removal. The handler deletes the row; this raises the fact. */
  markDisconnected(input: { userId: UUIDv4 }): void {
    this.addEvent(
      createEvent('ProductAppDataSourceDisconnected', {
        productAppDataSourceId: this.id,
        productId: this.productId,
        userId: input.userId,
        mcpServerId: this.mcpServerId,
      }),
    )
  }

  private markConnectionLost(): void {
    this.status = 'disconnected'
    this.addEvent(
      createEvent('ProductAppDataSourceConnectionLost', {
        productAppDataSourceId: this.id,
        productId: this.productId,
        mcpServerId: this.mcpServerId,
      }),
    )
  }

  private markReconnected(): void {
    this.status = 'connected'
    this.addEvent(
      createEvent('ProductAppDataSourceReconnected', {
        productAppDataSourceId: this.id,
        productId: this.productId,
        mcpServerId: this.mcpServerId,
      }),
    )
  }
}
