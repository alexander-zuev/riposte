import type { UUIDv4 } from '@riposte/core'
import type { KVClient } from '@server/infrastructure/kv/kv-client'
import { Result } from 'better-result'

const KV_PREFIX = 'stripe_oauth_state:'
const STATE_TTL_SECONDS = 600

export type StripeOAuthState = {
  userId: string
  productId: UUIDv4
  // TODO(stripe-link): add optional `redirectAfter?: string` so callers can
  // route the post-callback redirect (e.g. agent welcome link → back to /agent
  // instead of /notifications). Plumb into HandleStripeOAuthCallback result.
}

export async function createOAuthState(
  input: StripeOAuthState,
  kv: KVClient,
): Promise<Result<string, Error>> {
  const state = crypto.randomUUID()
  const result = await kv.put(`${KV_PREFIX}${state}`, JSON.stringify(input), {
    ttl: STATE_TTL_SECONDS,
  })

  if (result.isErr()) return Result.err(result.error)
  return Result.ok(state)
}

export async function consumeOAuthState(
  state: string,
  kv: KVClient,
): Promise<Result<StripeOAuthState | null, Error>> {
  const stored = await kv.get(`${KV_PREFIX}${state}`)
  if (stored.isErr()) return Result.err(stored.error)
  if (!stored.value) return Result.ok(null)

  const deleted = await kv.delete(`${KV_PREFIX}${state}`)
  if (deleted.isErr()) return Result.err(deleted.error)

  return Result.ok(JSON.parse(stored.value) as StripeOAuthState)
}
