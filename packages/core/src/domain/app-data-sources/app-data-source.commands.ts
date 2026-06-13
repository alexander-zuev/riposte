import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'

/**
 * MCP server connection state. Mirrors `MCPConnectionState` from the `agents` SDK
 * (the source of truth) — keep the values in sync if the SDK changes.
 */
export const mcpConnectionStateSchema = z.enum([
  'authenticating',
  'connecting',
  'connected',
  'discovering',
  'ready',
  'failed',
])

export type McpConnectionState = z.infer<typeof mcpConnectionStateSchema>

/**
 * Reconciles one app data source against the observed state of its MCP server.
 * Dispatched by the McpStateChanged integration-event effect handler, one command
 * per registered source. The handler forwards the SDK-reported `serverState` as-is;
 * the domain (`ProductAppDataSource.reconcile`) decides whether and how to
 * transition.
 */
export const syncProductAppDataSourceSchema = baseCommandSchema.extend({
  name: z.literal('SyncProductAppDataSource'),
  productId: z.uuidv4(),
  mcpServerId: z.string().min(1),
  serverState: mcpConnectionStateSchema,
})

export const syncProductAppDataSourceResultSchema = z.object({
  mcpServerId: z.string(),
})

export type SyncProductAppDataSource = z.infer<typeof syncProductAppDataSourceSchema>
export type SyncProductAppDataSourceResult = z.infer<typeof syncProductAppDataSourceResultSchema>
