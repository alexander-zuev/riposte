import { createCommand, createEvent, createLogger } from '@riposte/core'
import type {
  CredentialEncryptionError,
  DatabaseError,
  DisputeSyncLimitExceededError,
  GetStripeAppSettings,
  QueueError,
  ScheduledDisputeSyncDue,
  StripeApiError,
  StripeConnectionUnavailableError,
  SyncDisputes,
  ValidationError,
} from '@riposte/core'
import {
  DisputeSyncLimitExceededError as SyncLimitExceededError,
  StripeConnectionUnavailableError as CoreStripeConnectionUnavailableError,
  ValidationError as CoreValidationError,
} from '@riposte/core'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import { DisputeCase } from '@server/domain/disputes'
import type { AppDeps } from '@server/infrastructure/app-deps'
import { disputeSyncGateKey } from '@server/infrastructure/durable-objects/async-gate-client'
import { stripeRequest } from '@server/infrastructure/stripe/stripe-request'
import { Result } from 'better-result'

const logger = createLogger('stripe-app-handler')
const DISPUTE_SYNC_STALE_AFTER_HOURS = 24
const DISPUTE_SYNC_STALE_AFTER_MS = DISPUTE_SYNC_STALE_AFTER_HOURS * 60 * 60 * 1000
const DISPUTE_SYNC_PAGE_SIZE = 100
const DISPUTE_SYNC_MAX_DISPUTES = 1000
const DISPUTE_SYNC_SOURCE_TYPE = 'sync.disputes.list'
const MS_PER_DAY = 24 * 60 * 60 * 1000

// First slice: cap one scheduled fanout so cron cannot enqueue unbounded work.
// If the cap is hit, a best-effort continuation event picks up the next batch.
const DISPUTE_SYNC_FANOUT_LIMIT = 100

export type StripeAppSettings = {
  lastSyncAt: string | null
}

export const getStripeAppSettings: QueryHandler<
  GetStripeAppSettings,
  StripeAppSettings,
  DatabaseError
> = async (query, { deps }) => {
  const syncState = await deps.repos
    .stripeDisputeSyncState(deps.db())
    .findForAccount({ stripeAccountId: query.stripeAccountId, livemode: query.livemode })

  if (syncState.isErr()) return Result.err(syncState.error)

  return Result.ok({ lastSyncAt: syncState.value.lastSyncedAt })
}

type SyncDisputesError =
  | CredentialEncryptionError
  | DatabaseError
  | DisputeSyncLimitExceededError
  | StripeApiError
  | StripeConnectionUnavailableError
  | ValidationError

export const syncDisputes: CommandHandler<SyncDisputes, void, SyncDisputesError> = async (
  command,
  { deps, tx },
) => {
  const connection = await deps.repos
    .stripeConnections(tx)
    .findByStripeAccountId(command.stripeAccountId)
  if (connection.isErr()) return Result.err(connection.error)
  if (!connection.value) {
    return Result.err(
      new CoreStripeConnectionUnavailableError({
        reason: 'unknown_account',
        account: command.stripeAccountId,
      }),
    )
  }
  if (connection.value.livemode !== command.livemode) {
    return Result.err(
      new CoreValidationError({
        issues: [
          {
            code: 'invalid_value',
            path: ['livemode'],
            message: 'Sync command livemode does not match Stripe connection livemode',
          },
        ],
      }),
    )
  }

  const client = await deps.services.stripeClientProvider().getForAccount(command.stripeAccountId)
  if (client.isErr()) return Result.err(client.error)

  const disputeRepo = deps.repos.disputeCases(tx)
  let startingAfter: string | undefined
  let syncedCount = 0
  const invalidDisputes: Array<{ id: string; reason: ValidationError }> = []

  /* oxlint-disable eslint(no-await-in-loop) -- Stripe cursor pagination is sequential: each page needs the prior page's last dispute id. */
  while (true) {
    const page = await stripeRequest('disputes.list', async () =>
      client.value.disputes.list({
        created: getTimelineCreatedFilter(command.timeline),
        limit: DISPUTE_SYNC_PAGE_SIZE,
        starting_after: startingAfter,
      }),
    )
    if (page.isErr()) return Result.err(page.error)

    const stripeDisputes = page.value.data
    const nextSyncedCount = syncedCount + stripeDisputes.length
    if (
      nextSyncedCount > DISPUTE_SYNC_MAX_DISPUTES ||
      (nextSyncedCount === DISPUTE_SYNC_MAX_DISPUTES && page.value.has_more)
    ) {
      return Result.err(
        new SyncLimitExceededError({
          stripeAccountId: command.stripeAccountId,
          livemode: command.livemode,
          limit: DISPUTE_SYNC_MAX_DISPUTES,
        }),
      )
    }

    const existing = await disputeRepo.findByIds(stripeDisputes.map((dispute) => dispute.id))
    if (existing.isErr()) return Result.err(existing.error)

    const disputeCases: DisputeCase[] = []
    for (const stripeDispute of stripeDisputes) {
      const existingCase = existing.value.get(stripeDispute.id)
      if (existingCase) {
        const refreshed = existingCase.refreshStripeDisputeFacts(stripeDispute)
        if (refreshed.isErr()) {
          invalidDisputes.push({ id: stripeDispute.id, reason: refreshed.error })
          continue
        }
        disputeCases.push(existingCase)
        continue
      }

      const received = DisputeCase.receiveStripeDispute({
        userId: connection.value.userId,
        productId: connection.value.productId,
        stripeAccountId: connection.value.stripeAccountId,
        sourceStripeEventId: `sync:${command.id}:${stripeDispute.id}`,
        sourceStripeEventType: DISPUTE_SYNC_SOURCE_TYPE,
        stripeDispute,
      })
      if (received.isErr()) {
        invalidDisputes.push({ id: stripeDispute.id, reason: received.error })
        continue
      }
      disputeCases.push(received.value)
    }

    const saved = await disputeRepo.saveBatch(disputeCases)
    if (saved.isErr()) return Result.err(saved.error)

    syncedCount = nextSyncedCount
    startingAfter = stripeDisputes.at(-1)?.id

    if (!page.value.has_more) break
    if (!startingAfter) {
      return Result.err(
        new SyncLimitExceededError({
          stripeAccountId: command.stripeAccountId,
          livemode: command.livemode,
          limit: DISPUTE_SYNC_MAX_DISPUTES,
        }),
      )
    }
  }

  const marked = await deps.repos.stripeDisputeSyncState(tx).markSynced({
    userId: connection.value.userId,
    stripeAccountId: connection.value.stripeAccountId,
    livemode: connection.value.livemode,
    syncedAt: new Date(),
  })
  if (marked.isErr()) return Result.err(marked.error)

  if (command.syncRequestId) {
    await deps.services.asyncGate().tryResolve(disputeSyncGateKey(command.syncRequestId))
  }

  logger.info('stripe_disputes_synced', {
    stripeAccountId: command.stripeAccountId,
    livemode: command.livemode,
    count: syncedCount,
    invalidCount: invalidDisputes.length,
  })

  if (invalidDisputes.length > 0) {
    logger.error('stripe_disputes_sync_invalid_rows_skipped', {
      stripeAccountId: command.stripeAccountId,
      livemode: command.livemode,
      syncCommandId: command.id,
      invalidDisputes: invalidDisputes.map((invalid) => ({
        stripeDisputeId: invalid.id,
        issues: invalid.reason.issues,
      })),
    })
  }

  return Result.ok(undefined)
}

export const fanOutScheduledDisputeSync: EventHandler<
  ScheduledDisputeSyncDue,
  DatabaseError | QueueError
> = async (_event, { deps, tx }) => {
  const dueBefore = new Date(Date.now() - DISPUTE_SYNC_STALE_AFTER_MS)
  const accounts = await deps.repos
    .stripeDisputeSyncState(tx)
    .findDueAccounts({ dueBefore, limit: DISPUTE_SYNC_FANOUT_LIMIT })

  if (accounts.isErr()) return Result.err(accounts.error)

  const commands = accounts.value.map((account) =>
    createCommand('SyncDisputes', {
      userId: account.userId,
      stripeAccountId: account.stripeAccountId,
      livemode: account.livemode,
      timeline: 'last_120_days',
    }),
  )

  if (commands.length === 0) {
    logger.info('scheduled_dispute_sync_no_due_connections')
    return Result.ok(undefined)
  }

  const sent = await deps.services.queueClient().sendBatch(commands)
  if (sent.isErr()) return Result.err(sent.error)

  logger.info('scheduled_dispute_sync_commands_enqueued', {
    count: commands.length,
  })

  if (accounts.value.length === DISPUTE_SYNC_FANOUT_LIMIT) {
    deps.ctx.waitUntil(requeueScheduledDisputeSync(deps))
  }

  return Result.ok(undefined)
}

async function requeueScheduledDisputeSync(deps: AppDeps): Promise<void> {
  const sent = await deps.services.queueClient().send(createEvent('ScheduledDisputeSyncDue', {}))
  if (sent.isErr()) {
    logger.error('scheduled_dispute_sync_continuation_queue_failed', { error: sent.error })
  }
}

function getTimelineCreatedFilter(timeline: SyncDisputes['timeline']) {
  switch (timeline) {
    case 'last_120_days':
      return { gte: Math.floor((Date.now() - 120 * MS_PER_DAY) / 1000) }
    default:
      return { gte: Math.floor((Date.now() - 120 * MS_PER_DAY) / 1000) }
  }
}
