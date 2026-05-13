import { createCommand, createEvent, createLogger } from '@riposte/core'
import type {
  DatabaseError,
  GetStripeAppSettings,
  QueueError,
  ScheduledDisputeSyncDue,
  SyncDisputes,
} from '@riposte/core'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import type { AppDeps } from '@server/infrastructure/app-deps'
import { Result } from 'better-result'

const logger = createLogger('stripe-app-handler')
const DISPUTE_SYNC_STALE_AFTER_HOURS = 24
const DISPUTE_SYNC_STALE_AFTER_MS = DISPUTE_SYNC_STALE_AFTER_HOURS * 60 * 60 * 1000

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

export const syncDisputes: CommandHandler<SyncDisputes> = async (_command) => {
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
