import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

/**
 * Involuntary connection loss for a registered app data source (token revoked,
 * MCP server failed or unreachable). Distinct from ProductAppDataSourceDisconnected,
 * which is a user-initiated removal (carries userId, deletes the row). This keeps the
 * row and flips status to 'disconnected'. No userId — no human initiated it.
 */
export const productAppDataSourceConnectionLostSchema = baseEventSchema.extend({
  name: z.literal('ProductAppDataSourceConnectionLost'),
  productAppDataSourceId: z.uuidv4(),
  productId: z.uuidv4(),
  mcpServerId: z.string().min(1),
})

export type ProductAppDataSourceConnectionLost = z.infer<
  typeof productAppDataSourceConnectionLostSchema
>

/** Recovery of a previously lost app data source (MCP server back to ready). */
export const productAppDataSourceReconnectedSchema = baseEventSchema.extend({
  name: z.literal('ProductAppDataSourceReconnected'),
  productAppDataSourceId: z.uuidv4(),
  productId: z.uuidv4(),
  mcpServerId: z.string().min(1),
})

export type ProductAppDataSourceReconnected = z.infer<typeof productAppDataSourceReconnectedSchema>

/**
 * Integration event (not a domain fact): the agent's MCP client reported a server
 * state transition. Zero authority, deliberately payload-poor — productId only — so
 * its handler reads current truth (listMcpServers) and reconciles, never acting on an
 * edge payload. Policies must NOT subscribe; they subscribe to the domain events
 * (ConnectionLost / Reconnected) the reconciliation raises.
 */
export const mcpStateChangedSchema = baseEventSchema.extend({
  name: z.literal('McpStateChanged'),
  productId: z.uuidv4(),
})

export type McpStateChanged = z.infer<typeof mcpStateChangedSchema>
