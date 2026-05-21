import { createCommand, createLogger, EntityNotFoundError } from '@riposte/core'
import type {
  BuildStripeOAuthInstallUrl,
  CreateProduct,
  CreateProductResult,
  DOUnreachableError,
  DatabaseError,
  DeleteProduct,
  DeleteProductResult,
  DuplicateProductUrlError,
  GetProductSetupState,
  GetProductSetupStateResult,
  ListProducts,
  ListProductsResult,
  RegisterProductAppDataSource,
  RegisterProductAppDataSourceResult,
  UpdateProduct,
  UpdateProductResult,
  ValidationError,
} from '@riposte/core'
import { buildStripeOAuthInstallUrl } from '@server/application/handlers/stripe-oauth-handler'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
import { ProductAppDataSource } from '@server/domain/app-data-sources'
import { Product } from '@server/domain/products'
import { Result } from 'better-result'

const logger = createLogger('product-handler')

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

export const getProductSetupState: QueryHandler<
  GetProductSetupState,
  GetProductSetupStateResult,
  DatabaseError | EntityNotFoundError | DOUnreachableError
> = async (query, ctx) => {
  return await ctx.deps.services
    .productSetup()
    .getState({ userId: query.userId, productId: query.productId })
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

  // Prime the agent's onboarding chat. Non-fatal: orphan primes are harmless,
  // a missing prime can be re-primed later.
  const buildStripeOAuthCommand: BuildStripeOAuthInstallUrl = createCommand(
    'BuildStripeOAuthInstallUrl',
    {
      userId: command.userId,
      productId: saved.value.id,
      redirectAfter: `/products/${saved.value.id}/agent`,
    },
  )
  const stripeInstallUrl = await buildStripeOAuthInstallUrl(buildStripeOAuthCommand, ctx)
  if (stripeInstallUrl.isErr()) {
    logger.error('build_stripe_oauth_install_url_failed', {
      productId: saved.value.id,
      error: stripeInstallUrl.error,
    })
  }

  const primed = await ctx.deps.services.disputeAgentClient().primeOnboarding({
    userId: command.userId,
    productId: saved.value.id,
    productName: command.productName,
    connectStripeUrl: stripeInstallUrl.isOk()
      ? stripeInstallUrl.value.url
      : `/products/${saved.value.id}/connections`,
  })
  if (primed.isErr()) {
    logger.error('prime_onboarding_failed', { productId: saved.value.id, error: primed.error })
  }

  return Result.ok({ productId: saved.value.id })
}

export const registerProductAppDataSource: CommandHandler<
  RegisterProductAppDataSource,
  RegisterProductAppDataSourceResult,
  DatabaseError | EntityNotFoundError
> = async (command, ctx) => {
  const product = await ctx.deps.repos.products(ctx.tx).findById(command.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const repo = ctx.deps.repos.productAppDataSources(ctx.tx)

  const existing = await repo.findByProductIdAndMcpServerId({
    productId: command.productId,
    mcpServerId: command.mcpServerId,
  })
  if (existing.isErr()) return Result.err(existing.error)
  if (existing.value) {
    return Result.ok({ productAppDataSourceId: existing.value.id })
  }

  const source = ProductAppDataSource.create({
    productId: command.productId,
    mcpServerId: command.mcpServerId,
    alias: command.alias,
  })

  const saved = await repo.save(source)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({ productAppDataSourceId: saved.value.id })
}

export const updateProduct: CommandHandler<
  UpdateProduct,
  UpdateProductResult,
  DatabaseError | ValidationError | DuplicateProductUrlError | EntityNotFoundError
> = async (command, ctx) => {
  const repo = ctx.deps.repos.products(ctx.tx)

  const found = await repo.findById(command.productId)
  if (found.isErr()) return Result.err(found.error)
  if (!found.value || found.value.userId !== command.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const product = found.value
  const { id: _id, type: _type, name: _name, userId: _userId, productId: _pid, ...fields } = command
  const updated = product.update(fields)
  if (updated.isErr()) return Result.err(updated.error)

  const saved = await repo.save(product)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({ productId: saved.value.id })
}

/**
 * Delete is idempotent. If the product does not exist for this user — already
 * deleted, never existed, or belongs to someone else — return success without
 * emitting a ProductDeleted event. This avoids leaking existence across users.
 */
export const deleteProduct: CommandHandler<
  DeleteProduct,
  DeleteProductResult,
  DatabaseError
> = async (command, ctx) => {
  const repo = ctx.deps.repos.products(ctx.tx)

  const found = await repo.findById(command.productId)
  if (found.isErr()) return Result.err(found.error)
  if (!found.value || found.value.userId !== command.userId) {
    return Result.ok({ productId: command.productId })
  }

  const product = found.value
  product.markDeleted()

  const deleted = await repo.delete(product)
  if (deleted.isErr()) return Result.err(deleted.error)

  return Result.ok({ productId: command.productId })
}
