import type {
  AuthorizationError,
  CountActionableDisputeCases,
  CountActionableDisputeCasesResult,
  CredentialEncryptionError,
  DatabaseError,
  GetDisputeCaseStatus,
  GetDisputeCaseStatusResult,
  ListStripeDisputesForProduct,
  ListStripeDisputesForProductResult,
  ListDisputeCases,
  ListDisputeCasesResult,
  StripeApiError,
  StripeConnectionUnavailableError,
} from '@riposte/core'
import {
  AuthorizationError as CoreAuthorizationError,
  EntityNotFoundError,
  StripeConnectionUnavailableError as CoreStripeConnectionUnavailableError,
} from '@riposte/core'
import type { QueryHandler } from '@server/application/registry/types'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'
import type Stripe from 'stripe'

type ListStripeDisputesForProductError =
  | AuthorizationError
  | CredentialEncryptionError
  | DatabaseError
  | StripeApiError
  | StripeConnectionUnavailableError

type GetDisputeCaseStatusError = DatabaseError | EntityNotFoundError

export const listDisputeCases: QueryHandler<
  ListDisputeCases,
  ListDisputeCasesResult,
  DatabaseError
> = async (query, ctx) => {
  const page = await ctx.deps.repos.disputeCases(ctx.deps.db()).listForUser(query)
  if (page.isErr()) return Result.err(page.error)

  const sync = await ctx.deps.repos.stripeDisputeSyncState(ctx.deps.db()).findForUser(query.userId)
  if (sync.isErr()) return Result.err(sync.error)

  return Result.ok({
    items: page.value.items,
    nextCursor: page.value.nextCursor,
    sync: sync.value,
  })
}

export const countActionableDisputeCases: QueryHandler<
  CountActionableDisputeCases,
  CountActionableDisputeCasesResult,
  DatabaseError
> = async (query, ctx) => {
  const count = await ctx.deps.repos.disputeCases(ctx.deps.db()).countActionableForProduct({
    userId: query.userId,
    productId: query.productId,
  })
  if (count.isErr()) return Result.err(count.error)

  return Result.ok({ count: count.value })
}

export const listStripeDisputesForProduct: QueryHandler<
  ListStripeDisputesForProduct,
  ListStripeDisputesForProductResult,
  ListStripeDisputesForProductError
> = async (query, ctx) => {
  const connection = await ctx.deps.repos
    .stripeConnections(ctx.deps.db())
    .findByProductId(query.productId)
  if (connection.isErr()) return Result.err(connection.error)
  if (!connection.value) {
    return Result.err(new CoreStripeConnectionUnavailableError({ reason: 'missing_account' }))
  }
  if (connection.value.userId !== query.userId) {
    return Result.err(new CoreAuthorizationError())
  }

  const client = await ctx.deps.services
    .stripeClientProvider()
    .getForAccount(connection.value.stripeAccountId)
  if (client.isErr()) return Result.err(client.error)

  const disputes = await stripeRequest('disputes.list', async () =>
    client.value.disputes.list({
      limit: query.limit,
      created: query.created,
    }),
  )
  if (disputes.isErr()) return Result.err(disputes.error)

  return Result.ok({
    disputes: disputes.value.data.map(toStripeDisputeListItem),
    hasMore: disputes.value.has_more,
  })
}

export const getDisputeCaseStatus: QueryHandler<
  GetDisputeCaseStatus,
  GetDisputeCaseStatusResult,
  GetDisputeCaseStatusError
> = async (query, ctx) => {
  const disputeCase = await ctx.deps.repos.disputeCases(ctx.deps.db()).findByUserProductAndId({
    userId: query.userId,
    productId: query.productId,
    disputeCaseId: query.disputeCaseId,
  })
  if (disputeCase.isErr()) return Result.err(disputeCase.error)
  if (!disputeCase.value) {
    return Result.err(new EntityNotFoundError({ entity: 'DisputeCase', id: query.disputeCaseId }))
  }

  const snapshot = disputeCase.value.serialize()
  const state = snapshot.workflowState

  return Result.ok({
    disputeCaseId: snapshot.id,
    workflowStatus: state.status,
    stripeStatus: snapshot.stripeStatus,
    contestDecision: snapshot.contestDecision.status,
    evidenceDueBy: snapshot.evidenceDetailsDueBy?.toISOString() ?? null,
    updatedAt: snapshot.updatedAt.toISOString(),
    humanRequest:
      state.status === 'awaiting_human'
        ? {
            kind: state.request.kind,
            requestedAt: state.request.requestedAt.toISOString(),
            allowedResponses: [...state.request.allowedResponses],
          }
        : null,
    completion:
      state.status === 'completed'
        ? {
            reason: state.reason,
            completedAt: state.completedAt.toISOString(),
          }
        : null,
    failure: state.status === 'failed' ? { reason: state.reason } : null,
  })
}

function toStripeDisputeListItem(
  dispute: Stripe.Dispute,
): ListStripeDisputesForProductResult['disputes'][number] {
  return {
    id: dispute.id,
    amount: {
      amountMinor: dispute.amount,
      currency: dispute.currency,
    },
    reason: dispute.reason,
    status: dispute.status,
    createdAt: new Date(dispute.created * 1000).toISOString(),
    evidenceDueBy: dispute.evidence_details.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
      : null,
    chargeId: expandableId(dispute.charge),
    paymentIntentId: dispute.payment_intent ? expandableId(dispute.payment_intent) : null,
    livemode: dispute.livemode,
  }
}

function expandableId(value: string | { id: string }): string {
  return typeof value === 'string' ? value : value.id
}
