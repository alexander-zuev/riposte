import { DatabaseError, DuplicateProductUrlError } from '@riposte/core'
import { Product } from '@server/domain/products'
import type { IProductRepository } from '@server/domain/repository/interfaces'
import type { DbNewProduct, DrizzleDb } from '@server/infrastructure/db'
import { products } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, eq } from 'drizzle-orm'

import { BaseRepository } from './base.repository'

const PRODUCTS_URL_UNIQUE_CONSTRAINT = 'products_user_id_url_uniq'

export class ProductRepository extends BaseRepository implements IProductRepository {
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async findById(id: string): Promise<Result<Product | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db.select().from(products).where(eq(products.id, id)).limit(1)
        return row ?? null
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to find product', cause }),
    })

    return found.map((row) => (row ? Product.deserialize(row) : null))
  }

  async findByUserId(userId: string): Promise<Result<Product[], DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const rows = await this.db
          .select()
          .from(products)
          .where(eq(products.userId, userId))
          .orderBy(asc(products.createdAt))

        return rows
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to list products', cause }),
    })

    return found.map((rows) => rows.map((row) => Product.deserialize(row)))
  }

  async save(product: Product): Promise<Result<Product, DatabaseError | DuplicateProductUrlError>> {
    const productRow = product.serialize() satisfies DbNewProduct

    const saved = await Result.tryPromise<
      typeof products.$inferSelect,
      DatabaseError | DuplicateProductUrlError
    >({
      try: async () => {
        const [savedProductRow] = await this.db
          .insert(products)
          .values(productRow)
          .onConflictDoUpdate({
            target: products.id,
            set: {
              productName: productRow.productName,
              url: productRow.url,
              productType: productRow.productType,
              productDescription: productRow.productDescription,
              serviceStartRule: productRow.serviceStartRule,
              refundPolicyDisclosure: productRow.refundPolicyDisclosure,
              cancellationPolicyDisclosure: productRow.cancellationPolicyDisclosure,
              status: productRow.status,
              updatedAt: productRow.updatedAt,
            },
          })
          .returning()

        if (!savedProductRow) throw new Error('Product save returned no row')
        this.dispatchEvents(product)
        return savedProductRow
      },
      catch: (cause) => {
        const dbError = new DatabaseError({ message: 'Failed to save product', cause })
        if (
          dbError.pg?.code === '23505' &&
          dbError.pg.constraint === PRODUCTS_URL_UNIQUE_CONSTRAINT
        ) {
          return new DuplicateProductUrlError({ url: productRow.url })
        }
        return dbError
      },
    })

    return saved.map((savedProductRow) => Product.deserialize(savedProductRow))
  }

  async delete(product: Product): Promise<Result<void, DatabaseError>> {
    return await Result.tryPromise({
      try: async () => {
        await this.db
          .delete(products)
          .where(and(eq(products.id, product.id), eq(products.userId, product.userId)))
        this.dispatchEvents(product)
        return undefined
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to delete product', cause }),
    })
  }
}
