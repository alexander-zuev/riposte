import {
  DOUnreachableError,
  DatabaseError,
  EntityNotFoundError,
  PRODUCT_SETUP_STEPS,
  type ProductSetupCompletedAt,
  type ProductSetupState,
  type ProductSetupStep,
  type UUIDv4,
} from '@riposte/core'
import type { DisputePlaybook } from '@server/domain/dispute-playbooks'
import type { ProductSnapshot } from '@server/domain/products/product.entity'
import type {
  IDisputePlaybookRepository,
  IProductRepository,
  IStripeConnectionRepository,
} from '@server/domain/repository/interfaces'
import type { StripeConnection } from '@server/domain/stripe'
import type { IDisputeAgentClient } from '@server/infrastructure/agents/dispute-agent-client'
import { Result } from 'better-result'

export interface IProductSetupService {
  getState: (
    input: GetProductSetupStateInput,
  ) => Promise<Result<ProductSetupState, DatabaseError | EntityNotFoundError | DOUnreachableError>>
}

export type GetProductSetupStateInput = {
  userId: UUIDv4
  productId: UUIDv4
}

/**
 * Owns onboarding step satisfaction rules. Reads the artifacts that back each step
 * (product columns, stripe connection, dispute playbook, MCP DO storage) and
 * projects them into a `ProductSetupState`. Caller (query handler) is a one-liner.
 */
export class ProductSetupService implements IProductSetupService {
  constructor(
    private readonly products: IProductRepository,
    private readonly stripeConnections: IStripeConnectionRepository,
    private readonly disputePlaybooks: IDisputePlaybookRepository,
    private readonly disputeAgentClient: IDisputeAgentClient,
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

    const mcpResult = await this.disputeAgentClient.getProductMcpStatus({ userId, productId })
    if (mcpResult.isErr()) return Result.err(mcpResult.error)

    const completedAt = ProductSetupService.computeCompletedAt({
      product,
      stripeConnection: stripeResult.value,
      playbook: playbookResult.value,
      mcpFirstConnectedAt: mcpResult.value.firstConnectedAt,
    })
    const currentStep =
      PRODUCT_SETUP_STEPS.find((step: ProductSetupStep) => completedAt[step] === null) ?? null

    return Result.ok({ productId, currentStep, completedAt })
  }

  /**
   * Pure projection of onboarding artifacts → per-step completion timestamps.
   * Each step's `completedAt` is the timestamp of the artifact that satisfies it,
   * or `null` if the artifact does not exist yet. Single source of truth for
   * "what does it mean for step X to be done."
   *
   * Exposed (via class) for direct unit tests with mocked artifacts.
   */
  static computeCompletedAt(input: ComputeCompletedAtInput): ProductSetupCompletedAt {
    const { product, stripeConnection, playbook, mcpFirstConnectedAt } = input

    const stripeCompletedAt =
      stripeConnection && stripeConnection.status === 'active'
        ? stripeConnection.connectedAt.toISOString()
        : null

    const playbookCompletedAt =
      playbook && product.productDescription !== null ? playbook.createdAt.toISOString() : null

    const reviewCompletedAt =
      product.status === 'setup_complete' ? product.updatedAt.toISOString() : null

    return {
      add_product: product.createdAt.toISOString(),
      connect_stripe: stripeCompletedAt,
      connect_app_data: mcpFirstConnectedAt?.toISOString() ?? null,
      playbook: playbookCompletedAt,
      dry_run: null,
      review: reviewCompletedAt,
    } satisfies Record<ProductSetupStep, string | null>
  }
}

export type ComputeCompletedAtInput = {
  product: ProductSnapshot
  stripeConnection: StripeConnection | null
  playbook: DisputePlaybook | null
  mcpFirstConnectedAt: Date | null
}
