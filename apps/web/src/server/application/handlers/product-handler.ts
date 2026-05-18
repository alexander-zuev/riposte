import type {
  CreateProduct,
  CreateProductResult,
  DatabaseError,
  DuplicateProductUrlError,
  ListProducts,
  ListProductsResult,
  ValidationError,
} from '@riposte/core'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
import { Product } from '@server/domain/products'
import { Result } from 'better-result'

export const listProducts: QueryHandler<ListProducts, ListProductsResult, DatabaseError> = async (
  query,
  ctx,
) => {
  const found = await ctx.deps.repos.products(ctx.deps.db()).findByUserId(query.userId)
  if (found.isErr()) return Result.err(found.error)

  return Result.ok({
    items: found.value.map((product) => {
      const snapshot = product.serialize()
      return {
        id: snapshot.id,
        productName: snapshot.productName,
        url: snapshot.url,
        productType: snapshot.productType,
        status: snapshot.status,
        createdAt: snapshot.createdAt.toISOString(),
      }
    }),
  })
}

export const createProduct: CommandHandler<
  CreateProduct,
  CreateProductResult,
  DatabaseError | ValidationError | DuplicateProductUrlError
> = async (command, ctx) => {
  const product = Product.create({
    userId: command.userId,
    productName: command.productName,
    url: command.url,
    productType: command.productType,
  })
  if (product.isErr()) return Result.err(product.error)

  const saved = await ctx.deps.repos.products(ctx.tx).save(product.value)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({ productId: saved.value.id })
}
