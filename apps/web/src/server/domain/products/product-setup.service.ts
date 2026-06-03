import {
  DOUnreachableError,
  DatabaseError,
  EntityNotFoundError,
  PRODUCT_SETUP_STEPS,
  type ProductSetupCompletedAt,
  type ProductSetupState,
  type ProductSetupStep,
  type ReadProductSetupSnapshotResult,
  type UUIDv4,
} from '@riposte/core'
import type { DisputePlaybook } from '@server/domain/dispute-playbooks'
import { Product, type ProductSnapshot } from '@server/domain/products/product.entity'
import type {
  IDisputePlaybookRepository,
  IProductAppDataSourceRepository,
  IProductRepository,
  IStripeConnectionRepository,
} from '@server/domain/repository/interfaces'
import type { StripeConnection } from '@server/domain/stripe'
import { Result } from 'better-result'

export interface IProductSetupService {
  getState: (
    input: GetProductSetupStateInput,
  ) => Promise<Result<ProductSetupState, DatabaseError | EntityNotFoundError | DOUnreachableError>>
  getSetupSnapshot: (
    input: GetProductSetupStateInput,
  ) => Promise<
    Result<ReadProductSetupSnapshotResult, DatabaseError | EntityNotFoundError | DOUnreachableError>
  >
}

export type GetProductSetupStateInput = {
  userId: UUIDv4
  productId: UUIDv4
}

/**
 * Owns product setup step satisfaction rules. Reads the artifacts that back each step
 * (product columns, stripe connection, verified app data sources, dispute playbook) and
 * projects them into a `ProductSetupState`. Caller (query handler) is a one-liner.
 */
export class ProductSetupService implements IProductSetupService {
  constructor(
    private readonly products: IProductRepository,
    private readonly stripeConnections: IStripeConnectionRepository,
    private readonly productAppDataSources: IProductAppDataSourceRepository,
    private readonly disputePlaybooks: IDisputePlaybookRepository,
  ) {}

  async getState({
    userId,
    productId,
  }: GetProductSetupStateInput): Promise<
    Result<ProductSetupState, DatabaseError | EntityNotFoundError | DOUnreachableError>
  > {
    const productResult = await this.products.findById(productId)
    if (productResult.isErr()) return Result.err(productResult.error)
    if (!productResult.value) {
      return Result.err(new EntityNotFoundError({ entity: 'Product', id: productId }))
    }
    const product = productResult.value.serialize()
    if (product.userId !== userId) {
      return Result.err(new EntityNotFoundError({ entity: 'Product', id: productId }))
    }

    const stripeResult = await this.stripeConnections.findByProductId(productId)
    if (stripeResult.isErr()) return Result.err(stripeResult.error)

    const playbookResult = await this.disputePlaybooks.findLatestForProduct(productId)
    if (playbookResult.isErr()) return Result.err(playbookResult.error)

    const appDataSourcesResult = await this.productAppDataSources.findByProductId(productId)
    if (appDataSourcesResult.isErr()) return Result.err(appDataSourcesResult.error)

    return Result.ok(
      ProductSetupService.buildSetupState({
        productId,
        product,
        stripeConnection: stripeResult.value,
        playbook: playbookResult.value,
        appDataSourceConnectedAt: appDataSourcesResult.value[0]?.createdAt ?? null,
      }),
    )
  }

  async getSetupSnapshot({
    userId,
    productId,
  }: GetProductSetupStateInput): Promise<
    Result<ReadProductSetupSnapshotResult, DatabaseError | EntityNotFoundError | DOUnreachableError>
  > {
    const productResult = await this.products.findById(productId)
    if (productResult.isErr()) return Result.err(productResult.error)
    if (!productResult.value) {
      return Result.err(new EntityNotFoundError({ entity: 'Product', id: productId }))
    }
    const product = productResult.value.serialize()
    if (product.userId !== userId) {
      return Result.err(new EntityNotFoundError({ entity: 'Product', id: productId }))
    }

    const stripeResult = await this.stripeConnections.findByProductId(productId)
    if (stripeResult.isErr()) return Result.err(stripeResult.error)

    const playbookResult = await this.disputePlaybooks.findLatestForProduct(productId)
    if (playbookResult.isErr()) return Result.err(playbookResult.error)

    const appDataSourcesResult = await this.productAppDataSources.findByProductId(productId)
    if (appDataSourcesResult.isErr()) return Result.err(appDataSourcesResult.error)

    const setup = ProductSetupService.buildSetupState({
      productId,
      product,
      stripeConnection: stripeResult.value,
      playbook: playbookResult.value,
      appDataSourceConnectedAt: appDataSourcesResult.value[0]?.createdAt ?? null,
    })
    const stripe = stripeResult.value?.serialize() ?? null
    const playbook = playbookResult.value

    return Result.ok({
      snapshotAt: setup.snapshotAt,
      product: {
        id: product.id,
        productName: product.productName,
        url: product.url,
        productType: product.productType,
        status: product.status,
        productFacts: {
          productDescription: product.productDescription,
          serviceStartRule: product.serviceStartRule,
          refundPolicyDisclosure: product.refundPolicyDisclosure,
          cancellationPolicyDisclosure: product.cancellationPolicyDisclosure,
        },
        updatedAt: product.updatedAt.toISOString(),
      },
      setup,
      stripe: {
        connected: stripe?.status === 'active',
        livemode: stripe?.livemode ?? null,
        stripeAccountId: stripe?.stripeAccountId ?? null,
        status: stripe?.status ?? 'missing',
        updatedAt: stripe?.updatedAt.toISOString() ?? null,
      },
      appDataSources: appDataSourcesResult.value.map((source) => {
        const snapshot = source.serialize()
        return {
          id: snapshot.id,
          serverName: snapshot.serverName,
          serverUrl: snapshot.serverUrl,
          mcpServerId: snapshot.mcpServerId,
          createdAt: snapshot.createdAt.toISOString(),
        }
      }),
      playbook: {
        exists: playbook !== null,
        revision: playbook?.revision ?? null,
        createdAt: playbook?.createdAt.toISOString() ?? null,
      },
    })
  }

  private static buildSetupState(
    input: ComputeCompletedAtInput & { productId: UUIDv4 },
  ): ProductSetupState {
    const completedAt = ProductSetupService.computeCompletedAt(input)
    const currentStep =
      PRODUCT_SETUP_STEPS.find((step: ProductSetupStep) => completedAt[step] === null) ?? null

    return {
      productId: input.productId,
      currentStep,
      completedAt,
      snapshotAt: new Date().toISOString(),
    }
  }

  /**
   * Pure projection of product setup artifacts → per-step completion timestamps.
   * Each step's `completedAt` is the timestamp of the artifact that satisfies it,
   * or `null` if the artifact does not exist yet. Single source of truth for
   * "what does it mean for step X to be done."
   *
   * Exposed (via class) for direct unit tests with mocked artifacts.
   */
  static computeCompletedAt(input: ComputeCompletedAtInput): ProductSetupCompletedAt {
    const { product, stripeConnection, playbook, appDataSourceConnectedAt } = input

    return {
      add_product: product.createdAt.toISOString(),
      connect_stripe: ProductSetupService.isStripeStepComplete(stripeConnection)
        ? stripeConnection.connectedAt.toISOString()
        : null,
      connect_app_data: ProductSetupService.isAppDataStepComplete(appDataSourceConnectedAt)
        ? appDataSourceConnectedAt.toISOString()
        : null,
      playbook: ProductSetupService.isPlaybookStepComplete(product, playbook)
        ? playbook.createdAt.toISOString()
        : null,
      dry_run: null,
      review: ProductSetupService.isReviewStepComplete(product)
        ? product.updatedAt.toISOString()
        : null,
    } satisfies Record<ProductSetupStep, string | null>
  }

  private static isStripeStepComplete(
    stripeConnection: ComputeCompletedAtInput['stripeConnection'],
  ): stripeConnection is StripeConnection {
    return stripeConnection !== null && stripeConnection.status === 'active'
  }

  private static isAppDataStepComplete(
    appDataSourceConnectedAt: ComputeCompletedAtInput['appDataSourceConnectedAt'],
  ): appDataSourceConnectedAt is Date {
    return appDataSourceConnectedAt !== null
  }

  private static isPlaybookStepComplete(
    product: ProductSnapshot,
    playbook: DisputePlaybook | null,
  ): playbook is DisputePlaybook {
    return (
      playbook !== null &&
      playbook.validate().complete &&
      Product.deserialize(product).hasApprovedProductFacts()
    )
  }

  private static isReviewStepComplete(product: ProductSnapshot): boolean {
    return product.status === 'setup_complete'
  }
}

export type ComputeCompletedAtInput = {
  product: ProductSnapshot
  stripeConnection: StripeConnection | null
  playbook: DisputePlaybook | null
  appDataSourceConnectedAt: Date | null
}
