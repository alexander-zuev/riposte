import {
  createCommand,
  type DatabaseError,
  type DOUnreachableError,
  type McpStateChanged,
  type QueueError,
  type SyncProductAppDataSource,
  type SyncProductAppDataSourceResult,
} from '@riposte/core'
import type { CommandHandler, EffectHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

/**
 * Reconciles one app data source against the observed MCP server state. Loads the
 * registered source (no-op if absent — first-time connect/registration is the agent
 * tool's job, and user removal already deleted the row), lets the domain decide the
 * transition, then saves. The save is a no-op write when nothing changed.
 */
export const syncProductAppDataSource: CommandHandler<
  SyncProductAppDataSource,
  SyncProductAppDataSourceResult,
  DatabaseError
> = async (command, ctx) => {
  const repo = ctx.deps.repos.productAppDataSources(ctx.tx)

  const found = await repo.findByProductIdAndMcpServerId({
    productId: command.productId,
    mcpServerId: command.mcpServerId,
  })
  if (found.isErr()) return Result.err(found.error)
  if (!found.value) return Result.ok({ mcpServerId: command.mcpServerId })

  found.value.reconcile(command.serverState)

  const saved = await repo.save(found.value)
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok({ mcpServerId: command.mcpServerId })
}

/**
 * Effect for the `McpStateChanged` integration event. Runs OUTSIDE any UoW: reads live
 * MCP truth from the agent DO (RPC must not be held in a tx) and fans out one
 * `SyncProductAppDataSource` command per server onto the queue. No claim here — each
 * command carries a deterministic id (`sync-mcp:${event.id}:${serverId}`) so its own
 * claim dedupes redelivery, and `reconcile` is idempotent. A lost ping self-heals on
 * the next MCP transition.
 */
export const reconcileMcpState: EffectHandler<
  McpStateChanged,
  DOUnreachableError | QueueError
> = async (event, ctx) => {
  const servers = await ctx.deps.services
    .disputeAgentClient()
    .listMcpServers({ productId: event.productId })
  if (servers.isErr()) return Result.err(servers.error)
  if (servers.value.length === 0) return Result.ok(undefined)

  const commands = servers.value.map((server) =>
    createCommand(
      'SyncProductAppDataSource',
      {
        productId: event.productId,
        mcpServerId: server.mcpServerId,
        serverState: server.serverState,
      },
      `sync-mcp:${event.id}:${server.mcpServerId}`,
    ),
  )

  const sent = await ctx.deps.services.queueClient().sendBatch(commands)
  if (sent.isErr()) return Result.err(sent.error)

  return Result.ok(undefined)
}
