import type { KVClient } from '@server/infrastructure/kv/kv-client'
import { Result } from 'better-result'

const KV_PREFIX = 'slack_oauth_state:'
const STATE_TTL_SECONDS = 600

export type SlackOAuthState = {
  userId: string
}

export async function createSlackOAuthState(
  userId: string,
  kv: KVClient,
): Promise<Result<string, Error>> {
  const state = crypto.randomUUID()
  const result = await kv.put(`${KV_PREFIX}${state}`, JSON.stringify({ userId }), {
    ttl: STATE_TTL_SECONDS,
  })

  if (result.isErr()) return Result.err(result.error)
  return Result.ok(state)
}

export async function consumeSlackOAuthState(
  state: string,
  kv: KVClient,
): Promise<Result<SlackOAuthState | null, Error>> {
  const stored = await kv.get(`${KV_PREFIX}${state}`)
  if (stored.isErr()) return Result.err(stored.error)
  if (!stored.value) return Result.ok(null)

  const deleted = await kv.delete(`${KV_PREFIX}${state}`)
  if (deleted.isErr()) return Result.err(deleted.error)

  return Result.ok(JSON.parse(stored.value) as SlackOAuthState)
}
