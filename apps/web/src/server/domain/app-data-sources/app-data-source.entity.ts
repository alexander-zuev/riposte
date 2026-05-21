import { createEvent, type UUIDv4 } from '@riposte/core'
import { Entity } from '@server/domain/models/base.models'
import type { DbProductAppDataSource } from '@server/infrastructure/db'

export type ProductAppDataSourceSnapshot = {
  id: UUIDv4
  productId: UUIDv4
  mcpServerId: string
  alias: string
  createdAt: Date
}

export type CreateProductAppDataSourceInput = {
  productId: UUIDv4
  mcpServerId: string
  alias: string
}

export class ProductAppDataSource extends Entity<ProductAppDataSourceSnapshot> {
  private constructor(
    readonly id: UUIDv4,
    readonly productId: UUIDv4,
    readonly mcpServerId: string,
    readonly alias: string,
    readonly createdAt: Date,
  ) {
    super()
  }

  static create(
    input: CreateProductAppDataSourceInput,
    now: Date = new Date(),
  ): ProductAppDataSource {
    const source = new ProductAppDataSource(
      crypto.randomUUID() as UUIDv4,
      input.productId,
      input.mcpServerId,
      input.alias,
      now,
    )

    source.addEvent(
      createEvent('ProductAppDataSourceRegistered', {
        productAppDataSourceId: source.id,
        productId: source.productId,
        mcpServerId: source.mcpServerId,
        alias: source.alias,
      }),
    )

    return source
  }

  static deserialize(row: DbProductAppDataSource): ProductAppDataSource {
    return new ProductAppDataSource(
      row.id,
      row.productId,
      row.mcpServerId,
      row.alias,
      row.createdAt,
    )
  }

  serialize(): ProductAppDataSourceSnapshot {
    return {
      id: this.id,
      productId: this.productId,
      mcpServerId: this.mcpServerId,
      alias: this.alias,
      createdAt: this.createdAt,
    }
  }

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
}
