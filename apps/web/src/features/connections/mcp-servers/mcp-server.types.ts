import type { MCPServer } from 'agents'

/**
 * Live MCP connection state, derived from the Cloudflare Agents SDK so it can
 * never drift from the source of truth. Resolves to the SDK's
 * `MCPConnectionState`:
 * 'authenticating' | 'connecting' | 'connected' | 'discovering' | 'ready' | 'failed'.
 *
 * The chat-footer Sources popover also types against `MCPServer['state']`, so
 * FE and SDK stay aligned. Type-only import — erased at build, no `agents`
 * runtime is pulled into the client/Storybook bundle. Promote to `@riposte/core`
 * only if a second package needs it (would add an `agents` dep to core).
 */
export type McpServerStatus = MCPServer['state']

/**
 * Normalized presentation view of one MCP server. Mapped by the container from
 * the SDK's live `MCPServersState` — fields mirror `MCPServer` (camelCased) plus
 * a `toolCount` derived from `mcp.tools`. Keeps the cards free of `agents` at
 * runtime and trivially storybookable.
 */
export type McpServerEntry = {
  id: string
  name: string
  serverUrl: string
  status: McpServerStatus
  toolCount: number
  error: string | null
  /** Present when the server needs OAuth (re-)authorization; opened in a popup. */
  authUrl: string | null
}
