import { createLogger, EntityNotFoundError } from '@riposte/core'
import type {
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
  UpdateProduct,
  UpdateProductResult,
  ValidationError,
} from '@riposte/core'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
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
  // TODO(stripe-link): build a real Stripe install URL here via a shared
  // `buildStripeOAuthInstallUrl({ userId, productId, kv: ctx.deps.kv.auth,
  // redirectAfter: '/products/${id}/agent' })` helper, then pass it into
  // primeOnboarding so the welcome bubble links straight to Stripe instead of
  // /products/${id}/connections. Requires extracting the URL builder from
  // stripe.fn.ts and threading `redirectAfter` through stripe-oauth-state +
  // HandleStripeOAuthCallback result + /api/stripe/oauth/callback redirect.
  const primed = await ctx.deps.services.disputeAgentClient().primeOnboarding({
    userId: command.userId,
    productId: saved.value.id,
    productName: command.productName,
  })
  if (primed.isErr()) {
    logger.error('prime_onboarding_failed', { productId: saved.value.id, error: primed.error })
  }

  return Result.ok({ productId: saved.value.id })
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
