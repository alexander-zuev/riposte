import {
  AuthorizationError,
  createCommand,
  createQuery,
  EntityNotFoundError,
  countActionableDisputeCasesSchema,
  listDisputeCasesSchema,
  toServerFnRpc,
  uuidv7,
} from '@riposte/core'
import { disputeSyncGateKey } from '@server/infrastructure/durable-objects/async-gate-client'
import { requireAuth } from '@server/infrastructure/middleware/auth.middleware'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'
import { z } from 'zod'

const listDisputeCasesInputSchema = listDisputeCasesSchema.omit({
  type: true,
  name: true,
  userId: true,
})
const countActionableDisputeCasesInputSchema = countActionableDisputeCasesSchema.omit({
  type: true,
  name: true,
  userId: true,
})
const syncDisputesForProductInputSchema = z.object({
  productId: z.uuidv4(),
})

const SYNC_WAIT_MS = 15_000

export const listDisputeCases = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(listDisputeCasesInputSchema)
  .handler(async ({ data, context }) => {
    const input = listDisputeCasesInputSchema.parse(data)
    const query = createQuery('ListDisputeCases', {
      ...input,
      userId: context.user.id,
    })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const countActionableDisputeCases = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .inputValidator(countActionableDisputeCasesInputSchema)
  .handler(async ({ data, context }) => {
    const input = countActionableDisputeCasesInputSchema.parse(data)
    const query = createQuery('CountActionableDisputeCases', {
      ...input,
      userId: context.user.id,
    })
    const result = await context.deps.services.messageBus().handle(query)

    return toServerFnRpc(result)
  })

export const syncDisputesForProduct = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .inputValidator(syncDisputesForProductInputSchema)
  .handler(async ({ data, context }) => {
    const connection = await context.deps.repos
      .stripeConnections(context.deps.db())
      .findByProductId(data.productId)
    if (connection.isErr()) return toServerFnRpc(Result.err(connection.error))
    if (!connection.value) {
      return toServerFnRpc(
        Result.err(new EntityNotFoundError({ entity: 'Stripe connection', id: data.productId })),
      )
    }
    if (connection.value.userId !== context.user.id) {
      return toServerFnRpc(Result.err(new AuthorizationError()))
    }

    const syncRequestId = uuidv7()
    const command = createCommand('SyncDisputes', {
      userId: context.user.id,
      stripeAccountId: connection.value.stripeAccountId,
      livemode: connection.value.livemode,
      timeline: 'last_120_days',
      syncRequestId,
    })
    const queued = await context.deps.services.queueClient().send(command)
    if (queued.isErr()) return toServerFnRpc(queued)

    const gate = await context.deps.services
      .asyncGate()
      .waitFor(disputeSyncGateKey(syncRequestId), SYNC_WAIT_MS)
    if (gate.isErr()) return toServerFnRpc(gate)

    return toServerFnRpc(
      Result.ok({
        status: gate.value === 'resolved' ? 'completed' : 'pending',
      }),
    )
  })
