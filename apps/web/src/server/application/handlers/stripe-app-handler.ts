import type { GetStripeAppSettings, SyncDisputes } from '@riposte/core'
import type { CommandHandler, QueryHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

export type StripeAppSettings = {
  lastSyncAt: string | null
}

export const getStripeAppSettings: QueryHandler<GetStripeAppSettings, StripeAppSettings> = async (
  _query,
) => {
  return Result.ok({ lastSyncAt: null })
}

export const syncDisputes: CommandHandler<SyncDisputes> = async (_command) => {
  return Result.ok(undefined)
}
