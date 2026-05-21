import { DatabaseError, type UUIDv4 } from '@riposte/core'
import { ProductAppDataSource } from '@server/domain/app-data-sources'
import type { IProductAppDataSourceRepository } from '@server/domain/repository/interfaces'
import {
  productAppDataSources,
  type DbNewProductAppDataSource,
  type DrizzleDb,
} from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, eq } from 'drizzle-orm'

import { BaseRepository } from './base.repository'

export class ProductAppDataSourceRepository
  extends BaseRepository
  implements IProductAppDataSourceRepository
{
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async save(source: ProductAppDataSource): Promise<Result<ProductAppDataSource, DatabaseError>> {
    const row = source.serialize() satisfies DbNewProductAppDataSource

    const saved = await Result.tryPromise({
      try: async () => {
        const [savedRow] = await this.db.insert(productAppDataSources).values(row).returning()

        if (!savedRow) throw new Error('ProductAppDataSource save returned no row')
        this.dispatchEvents(source)
        return savedRow
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save product app data source', cause }),
    })

    return saved.map((row) => ProductAppDataSource.deserialize(row))
  }

  async findByProductId(productId: UUIDv4): Promise<Result<ProductAppDataSource[], DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        return await this.db
          .select()
          .from(productAppDataSources)
          .where(eq(productAppDataSources.productId, productId))
          .orderBy(asc(productAppDataSources.createdAt))
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to list product app data sources', cause }),
    })

    return found.map((rows) => rows.map((sourceRow) => ProductAppDataSource.deserialize(sourceRow)))
  }

  async findByProductIdAndMcpServerId(input: {
    productId: UUIDv4
    mcpServerId: string
  }): Promise<Result<ProductAppDataSource | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select()
          .from(productAppDataSources)
          .where(
            and(
              eq(productAppDataSources.productId, input.productId),
              eq(productAppDataSources.mcpServerId, input.mcpServerId),
            ),
          )
          .limit(1)

        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find product app data source', cause }),
    })

    return found.map((row) => (row ? ProductAppDataSource.deserialize(row) : null))
  }
}
