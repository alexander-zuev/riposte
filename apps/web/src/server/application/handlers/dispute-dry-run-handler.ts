import {
  createCommand,
  createLogger,
  EntityNotFoundError,
  type BlobStorageError,
  type DatabaseError,
  type DOUnreachableError,
  type DuplicateMessageError,
  type EvidencePdfRenderError,
  type StartDryRun,
  type StripeApiError,
  type ValidationError as ValidationErrorType,
  uuidv7,
} from '@riposte/core'
import { startDisputeEvidenceCollection } from '@server/application/handlers/dispute-workflow-handler'
import type { CommandHandler } from '@server/application/registry/types'
import { DisputeCase } from '@server/domain/disputes'
import type { GetClientError } from '@server/infrastructure/stripe/stripe-client-provider'
import { Result } from 'better-result'

const logger = createLogger('dispute-dry-run-handler')

// Mirrors `DisputeWorkflowCommandError` because we dispatch
// `StartDisputeEvidenceCollection` internally and bubble its errors.
type DryRunError =
  | BlobStorageError
  | DatabaseError
  | DOUnreachableError
  | DuplicateMessageError
  | EntityNotFoundError
  | EvidencePdfRenderError
  | GetClientError
  | StripeApiError
  | ValidationErrorType

export type StartDryRunResult = {
  disputeCaseId: string
  fiberId: string
}

/**
 * Inserts a synthetic `dispute_cases` row and triggers the evidence-collection
 * loop against it. Used by the chat agent's `startDryRun` tool during setup
 * mode so the merchant can watch the agent run before any real disputes flow.
 *
 * TODO(dry-run): replace synthetic case with a Stripe test-mode dispute when
 * slice 5 wires the polished dry-run UX. The inline `buildSyntheticStripeDispute`
 * helper below is temporary — delete when that lands.
 * TODO(dry-run): the case `save` and `StartDisputeEvidenceCollection` dispatch
 * are not atomic. If the dispatch fails, an orphan dispute_cases row remains.
 * Acceptable for v1; revisit when we have UoW around the bus.
 * TODO(dry-run): no idempotency — repeated tool calls create new synthetic
 * cases and parallel runs. Fine for testing; add dedupe in slice 5.
 */
export const startDryRun: CommandHandler<StartDryRun, StartDryRunResult, DryRunError> = async (
  command,
  { deps, tx },
) => {
  const product = await deps.repos.products(tx).findById(command.productId)
  if (product.isErr()) return Result.err(product.error)
  if (!product.value) {
    return Result.err(new EntityNotFoundError({ entity: 'Product', id: command.productId }))
  }

  const dryRunId = uuidv7()
  const idSuffix = dryRunId.replaceAll('-', '').slice(0, 16)
  const productSnapshot = product.value.serialize()

  const received = DisputeCase.receiveStripeDispute({
    userId: productSnapshot.userId,
    productId: command.productId,
    stripeAccountId: `acct_DRY_RUN_${idSuffix}`,
    sourceStripeEventId: `evt_DRY_RUN_${idSuffix}`,
    sourceStripeEventType: 'dry_run.dispute.created',
    stripeDispute: buildSyntheticStripeDispute({ idSuffix }),
  })
  if (received.isErr()) return Result.err(received.error)

  const saved = await deps.repos.disputeCases(tx).save(received.value)
  if (saved.isErr()) return Result.err(saved.error)

  // Call the workflow handler directly (not via bus) so we don't have to widen
  // the error union with bus-level wrappers (MessageBusError, UnknownMessageTypeError).
  const workflowInstanceId = `dry-run-${dryRunId}`
  const started = await startDisputeEvidenceCollection(
    createCommand('StartDisputeEvidenceCollection', {
      disputeCaseId: saved.value.id,
      workflowInstanceId,
    }),
    { deps, tx },
  )
  if (started.isErr()) return Result.err(started.error)

  logger.info('dispute_dry_run_started', {
    productId: command.productId,
    disputeCaseId: saved.value.id,
    fiberId: started.value.fiberId,
    workflowInstanceId,
  })

  return Result.ok({
    disputeCaseId: saved.value.id,
    fiberId: started.value.fiberId,
  })
}

/* -------------------------------------------------------------------------------------------------
 * TEMPORARY — synthetic Stripe dispute payload for the v1 dry-run handler.
 * Delete this whole block when slice 5 switches to Stripe test-mode disputes.
 * Mirrors the test/fixtures/disputes.ts shape; both pass parseStripeDisputeObject.
 * ----------------------------------------------------------------------------------------------- */

function buildSyntheticStripeDispute({ idSuffix }: { idSuffix: string }) {
  const now = Math.floor(Date.now() / 1000)
  const dueBy = now + 14 * 24 * 60 * 60 // 14 days from now
  return {
    id: `dp_DRY_RUN_${idSuffix}`,
    object: 'dispute',
    amount: 4900,
    charge: `ch_DRY_RUN_${idSuffix}`,
    created: now,
    currency: 'usd',
    balance_transaction: `txn_DRY_RUN_${idSuffix}`,
    balance_transactions: [
      {
        id: `txn_DRY_RUN_${idSuffix}`,
        amount: -4900,
        currency: 'usd',
        fee: 1500,
        net: -6400,
        reporting_category: 'dispute',
        type: 'adjustment',
      },
    ],
    metadata: { dryRun: 'true' },
    enhanced_eligibility_types: ['visa_compelling_evidence_3'],
    evidence_details: {
      due_by: dueBy,
      enhanced_eligibility: {},
      has_evidence: false,
      past_due: false,
      submission_count: 0,
    },
    is_charge_refundable: true,
    livemode: false,
    payment_intent: `pi_DRY_RUN_${idSuffix}`,
    payment_method_details: {
      type: 'card',
      card: {
        brand: 'visa',
        case_type: 'chargeback',
        network_reason_code: '10.4',
      },
    },
    evidence: {
      billing_address: 'US',
      customer_email_address: 'dry-run-customer@example.test',
      customer_name: 'Dry Run Customer',
      customer_purchase_ip: null,
      enhanced_evidence: {},
      product_description: 'Dry run synthetic product',
    },
    reason: 'fraudulent',
    status: 'warning_needs_response',
  }
}
