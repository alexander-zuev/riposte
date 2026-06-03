import {
  createCommand,
  createLogger,
  EntityNotFoundError,
  RevisionConflictError,
  ValidationError,
} from '@riposte/core'
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
  DisputePlaybookCreated,
  DisputePlaybookRevised,
  DuplicateProductUrlError,
  GetProductSetupState,
  GetProductSetupStateResult,
  ListProducts,
  ListProductsResult,
  McpOAuthRefreshFailed,
  ProductAppDataSourceDisconnected,
  ProductAppDataSourceRegistered,
  ProductCreated,
  ProductSetupCompleted,
  ProductUpdated,
  ReadProductDisputeSetup,
  ReadProductDisputeSetupResult,
  ReadProductSetupSnapshot,
  ReadProductSetupSnapshotResult,
  RegisterProductAppDataSource,
  RegisterProductAppDataSourceResult,
  RestartProductSetup,
  RestartProductSetupResult,
  WriteDisputePlaybook,
  EditDisputePlaybook,
  ReadDisputePlaybook,
  ReadDisputePlaybookResult,
  DisputePlaybookRevisionResult,
  PlaybookEditError,
  StripeConnectionCreated,
  UpdateProduct,
  UpdateProductResult,
} from '@riposte/core'
import { buildStripeOAuthInstallUrl } from '@server/application/handlers/stripe-oauth-handler'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import { ProductAppDataSource } from '@server/domain/app-data-sources'
import { applyPlaybookEdit, DisputePlaybook } from '@server/domain/dispute-playbooks'
import { Product } from '@server/domain/products'
import { Result } from 'better-result'

const logger = createLogger('product-handler')

type ProductSetupChangedEvent =
  | ProductCreated
  | StripeConnectionCreated
  | ProductAppDataSourceRegistered
  | ProductAppDataSourceDisconnected
  | ProductUpdated
  | DisputePlaybookCreated
  | DisputePlaybookRevised
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
    serverName: command.serverName,
    serverUrl: command.serverUrl,
  })

  const saved = await repo.save(source)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({ productAppDataSourceId: saved.value.id })
}

export const restartProductSetup: CommandHandler<
  RestartProductSetup,
  RestartProductSetupResult,
  DatabaseError | EntityNotFoundError | DOUnreachableError | DuplicateProductUrlError
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

  const playbookDeleted = await ctx.deps.repos
    .disputePlaybooks(ctx.tx)
    .deleteForProduct(command.productId)
  if (playbookDeleted.isErr()) return Result.err(playbookDeleted.error)

  product.value.restartSetup()
  const productSaved = await ctx.deps.repos.products(ctx.tx).save(product.value)
  if (productSaved.isErr()) return Result.err(productSaved.error)

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

export const readDisputePlaybook: QueryHandler<
  ReadDisputePlaybook,
  ReadDisputePlaybookResult,
  DatabaseError | EntityNotFoundError
> = async (query, ctx) => {
  const db = ctx.deps.db()
  const product = await ctx.deps.repos.products(db).findById(query.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value || product.value.userId !== query.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: query.productId }))
  }

  const latest = await ctx.deps.repos.disputePlaybooks(db).findLatestForProduct(query.productId)
  if (latest.isErr()) return Result.err(latest.error)

  // Absent is the caller's call: setup reads it as "none yet, write one", runtime as failure.
  if (!latest.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputePlaybook', id: query.productId }))
  }

  return Result.ok({
    revision: latest.value.revision,
    content: latest.value.playbookMd,
    createdAt: latest.value.createdAt.toISOString(),
    validation: latest.value.validate(),
  })
}

/**
 * Combined read for the playbook page. Orchestrates the playbook and the product facts in one query
 * so the frontend reads them with a single request. Unlike
 * `readDisputePlaybook`, an absent playbook is not an error here: it returns `playbook: null` so
 * the page still shows product facts during onboarding.
 */
export const readProductDisputeSetup: QueryHandler<
  ReadProductDisputeSetup,
  ReadProductDisputeSetupResult,
  DatabaseError | EntityNotFoundError
> = async (query, ctx) => {
  const db = ctx.deps.db()
  const product = await ctx.deps.repos.products(db).findById(query.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value || product.value.userId !== query.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: query.productId }))
  }

  const latest = await ctx.deps.repos.disputePlaybooks(db).findLatestForProduct(query.productId)
  if (latest.isErr()) return Result.err(latest.error)

  const snapshot = product.value.serialize()

  return Result.ok({
    playbook: latest.value
      ? {
          revision: latest.value.revision,
          content: latest.value.playbookMd,
          createdAt: latest.value.createdAt.toISOString(),
          validation: latest.value.validate(),
        }
      : null,
    productFacts: {
      productDescription: snapshot.productDescription,
      serviceStartRule: snapshot.serviceStartRule,
      refundPolicyDisclosure: snapshot.refundPolicyDisclosure,
      cancellationPolicyDisclosure: snapshot.cancellationPolicyDisclosure,
    },
  })
}

export const writeDisputePlaybook: CommandHandler<
  WriteDisputePlaybook,
  DisputePlaybookRevisionResult,
  DatabaseError | EntityNotFoundError | ValidationError
> = async (command, ctx) => {
  const product = await ctx.deps.repos.products(ctx.tx).findById(command.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value || product.value.userId !== command.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const repo = ctx.deps.repos.disputePlaybooks(ctx.tx)
  const existing = await repo.findLatestForProduct(command.productId)
  if (existing.isErr()) return Result.err(existing.error)
  // Write is create-only: once a playbook exists, all changes go through editPlaybook.
  if (existing.value) {
    return Result.err(
      new ValidationError({
        issues: [
          {
            code: 'playbook_exists',
            path: ['content'],
            message: 'Playbook already exists. Use editPlaybook to modify it.',
          },
        ],
        message: 'Playbook already exists. Use editPlaybook to modify it.',
      }),
    )
  }

  const playbook = await DisputePlaybook.create({
    productId: command.productId,
    createdBy: command.userId,
    playbookMd: command.content,
  })

  const saved = await repo.save(playbook)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({
    revision: saved.value.revision,
    validation: saved.value.validate(),
  })
}

export const editDisputePlaybook: CommandHandler<
  EditDisputePlaybook,
  DisputePlaybookRevisionResult,
  DatabaseError | EntityNotFoundError | RevisionConflictError | PlaybookEditError
> = async (command, ctx) => {
  const product = await ctx.deps.repos.products(ctx.tx).findById(command.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value || product.value.userId !== command.userId) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const repo = ctx.deps.repos.disputePlaybooks(ctx.tx)
  const latest = await repo.findLatestForProduct(command.productId)
  if (latest.isErr()) return Result.err(latest.error)
  if (!latest.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputePlaybook', id: command.productId }))
  }
  if (latest.value.revision !== command.baseRevision) {
    return Result.err(
      new RevisionConflictError({
        currentRevision: latest.value.revision,
        baseRevision: command.baseRevision,
      }),
    )
  }

  const edited = applyPlaybookEdit(latest.value.playbookMd, command.old, command.new)
  if (edited.isErr()) return Result.err(edited.error)

  const playbook = await latest.value.revise({
    createdBy: command.userId,
    playbookMd: edited.value,
  })

  const saved = await repo.save(playbook)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({
    revision: saved.value.revision,
    validation: saved.value.validate(),
  })
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
// TODO: wire up user notification when MCP OAuth refresh fails permanently
export const handleMcpOAuthRefreshFailed: EventHandler<McpOAuthRefreshFailed> = async (_event) => {
  return Result.ok(undefined)
}

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
