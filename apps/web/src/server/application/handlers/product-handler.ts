import { createCommand, createLogger, EntityNotFoundError } from '@riposte/core'
import type {
  BuildStripeOAuthInstallUrl,
  CreateProduct,
  CreateProductResult,
  DOUnreachableError,
  DatabaseError,
  DeleteProduct,
  DeleteProductResult,
  DisconnectProductAppDataSource,
  DisconnectProductAppDataSourceResult,
  DuplicateProductUrlError,
  GetProductSetupState,
  GetProductSetupStateResult,
  ListProducts,
  ListProductsResult,
  ProductAppDataSourceDisconnected,
  ProductAppDataSourceRegistered,
  ProductSetupCompleted,
  ReadProductSetupSnapshot,
  ReadProductSetupSnapshotResult,
  RegisterProductAppDataSource,
  RegisterProductAppDataSourceResult,
  RestartProductSetup,
  RestartProductSetupResult,
  StripeConnectionCreated,
  UpdateProduct,
  UpdateProductResult,
  ValidationError,
} from '@riposte/core'
import { buildStripeOAuthInstallUrl } from '@server/application/handlers/stripe-oauth-handler'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import { ProductAppDataSource } from '@server/domain/app-data-sources'
import { Product } from '@server/domain/products'
import { Result } from 'better-result'

const logger = createLogger('product-handler')

type ProductSetupChangedEvent =
  | StripeConnectionCreated
  | ProductAppDataSourceRegistered
  | ProductAppDataSourceDisconnected
  | ProductSetupCompleted

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

export const readProductSetupSnapshot: QueryHandler<
  ReadProductSetupSnapshot,
  ReadProductSetupSnapshotResult,
  DatabaseError | EntityNotFoundError | DOUnreachableError
> = async (query, ctx) => {
  return await ctx.deps.services
    .productSetup()
    .getSetupSnapshot({ userId: query.userId, productId: query.productId })
}

export const notifyProductSetupChanged: EventHandler<
  ProductSetupChangedEvent,
  DatabaseError | EntityNotFoundError | DOUnreachableError
> = async (event, ctx) => {
  const productId = event.productId
  const product = await ctx.deps.repos.products(ctx.tx).findById(productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: productId }))
  }

  const notified = await ctx.deps.services.disputeAgentClient().signalProductSetupChanged({
    userId: product.value.userId,
    productId,
    setupChangeId: event.id,
  })
  if (notified.isErr()) return Result.err(notified.error)

  return Result.ok(undefined)
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

  // Prime the agent's product setup chat. Non-fatal: orphan primes are harmless,
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

  const primed = await ctx.deps.services.disputeAgentClient().primeProductSetup({
    userId: command.userId,
    productId: saved.value.id,
    productName: command.productName,
    connectStripeUrl: stripeInstallUrl.isOk()
      ? stripeInstallUrl.value.url
      : `/products/${saved.value.id}/connections`,
  })
  if (primed.isErr()) {
    logger.error('prime_product_setup_failed', { productId: saved.value.id, error: primed.error })
  }

  return Result.ok({ productId: saved.value.id })
}

/**
 * PG cleanup half of MCP disconnect. The DO's `disconnectMcp` clears live
 * state, broadcasts to the FE over WS, and dispatches this command to wipe
 * the persisted `product_app_data_sources` row. Idempotent: missing rows
 * (DO-only connections, or a retry after a prior success) succeed with the
 * same shape. See `dispute-agent.ts > disconnectMcp` and the register flow
 * for symmetry.
 */
export const disconnectProductAppDataSource: CommandHandler<
  DisconnectProductAppDataSource,
  DisconnectProductAppDataSourceResult,
  DatabaseError
> = async (command, ctx) => {
  const repo = ctx.deps.repos.productAppDataSources(ctx.tx)

  const found = await repo.findByProductIdAndMcpServerId({
    productId: command.productId,
    mcpServerId: command.mcpServerId,
  })
  if (found.isErr()) return Result.err(found.error)
  if (!found.value) {
    return Result.ok({ mcpServerId: command.mcpServerId })
  }

  found.value.markDisconnected({ userId: command.userId })

  const deleted = await repo.delete(found.value)
  if (deleted.isErr()) return Result.err(deleted.error)

  return Result.ok({ mcpServerId: command.mcpServerId })
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

export const restartProductSetup: CommandHandler<
  RestartProductSetup,
  RestartProductSetupResult,
  DatabaseError | EntityNotFoundError | DOUnreachableError
> = async (command, ctx) => {
  const product = await ctx.deps.repos.products(ctx.tx).findById(command.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value || product.value.userId !== command.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const appDataSourceRepo = ctx.deps.repos.productAppDataSources(ctx.tx)
  const appDataSources = await appDataSourceRepo.findByProductId(command.productId)
  if (appDataSources.isErr()) return Result.err(appDataSources.error)

  const deletedAppDataSources = await Promise.all(
    appDataSources.value.map(async (source) => {
      source.markDisconnected({ userId: command.userId })
      return appDataSourceRepo.delete(source)
    }),
  )
  const failedDelete = deletedAppDataSources.find((deleted) => deleted.isErr())
  if (failedDelete?.isErr()) {
    return Result.err(failedDelete.error)
  }

  const restarted = await ctx.deps.services.disputeAgentClient().restartSetup({
    userId: command.userId,
    productId: command.productId,
  })
  if (restarted.isErr()) return Result.err(restarted.error)

  const stripeInstallUrl = await buildStripeOAuthInstallUrl(
    createCommand('BuildStripeOAuthInstallUrl', {
      userId: command.userId,
      productId: command.productId,
      redirectAfter: `/products/${command.productId}/agent`,
    }),
    ctx,
  )
  if (stripeInstallUrl.isErr()) {
    logger.error('build_stripe_oauth_install_url_failed', {
      productId: command.productId,
      error: stripeInstallUrl.error,
    })
  }

  const snapshot = product.value.serialize()
  const primed = await ctx.deps.services.disputeAgentClient().primeProductSetup({
    userId: command.userId,
    productId: command.productId,
    productName: snapshot.productName,
    connectStripeUrl: stripeInstallUrl.isOk()
      ? stripeInstallUrl.value.url
      : `/products/${command.productId}/connections`,
  })
  if (primed.isErr()) return Result.err(primed.error)

  return Result.ok({ productId: command.productId })
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
