import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import { createLogger } from '@riposte/core'
import type { DisputeAgentType } from '@server/infrastructure/agents/dispute-agent'
import { DurableObjectOAuthClientProvider } from 'agents'

const logger = createLogger('mcp-oauth')

const MCP_OAUTH_CLIENT_NAME = 'Riposte'
export const MCP_OAUTH_TOKEN_SCHEDULE_KEY = 'riposte:mcp_oauth_token_schedule:v1'

type McpServerId = string
type ISODateString = string

export type McpOAuthTokenSchedule = {
  servers: Record<McpServerId, ISODateString>
}

export class RiposteMcpOAuthProvider extends DurableObjectOAuthClientProvider {
  get clientMetadata() {
    return {
      ...super.clientMetadata,
      client_name: MCP_OAUTH_CLIENT_NAME,
    }
  }

  override async saveTokens(tokens: OAuthTokens): Promise<void> {
    await super.saveTokens(tokens)
    await setMcpOAuthTokenExpiry(this.storage, this.serverId, tokens)
  }
}

export async function loadMcpOAuthTokenSchedule(
  storage: DurableObjectStorage,
): Promise<McpOAuthTokenSchedule | null> {
  const stored = await storage.get<McpOAuthTokenSchedule>(MCP_OAUTH_TOKEN_SCHEDULE_KEY)
  if (!stored || typeof stored !== 'object' || !stored.servers) {
    return null
  }
  return stored
}

async function saveMcpOAuthTokenSchedule(
  storage: DurableObjectStorage,
  schedule: McpOAuthTokenSchedule,
): Promise<void> {
  await storage.put(MCP_OAUTH_TOKEN_SCHEDULE_KEY, schedule)
}

export async function setMcpOAuthTokenExpiry(
  storage: DurableObjectStorage,
  serverId: string,
  tokens: OAuthTokens,
  now = new Date(),
): Promise<void> {
  const schedule = (await loadMcpOAuthTokenSchedule(storage)) ?? { servers: {} }
  const expiresInSeconds = tokens.expires_in

  if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds)) {
    logger.warn('mcp_oauth_token_missing_expires_in', { serverId })
    return
  }

  schedule.servers[serverId] = new Date(now.getTime() + expiresInSeconds * 1000).toISOString()
  await saveMcpOAuthTokenSchedule(storage, schedule)
}

export async function removeMcpOAuthTokenExpiry(
  storage: DurableObjectStorage,
  serverId: string,
): Promise<void> {
  const schedule = await loadMcpOAuthTokenSchedule(storage)
  if (!schedule) return
  delete schedule.servers[serverId]
  await saveMcpOAuthTokenSchedule(storage, schedule)
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type McpOAuthResult =
  | { serverId: string; authSuccess: true; authError?: undefined }
  | { serverId?: string; authSuccess: false; authError: string }

/**
 * Handler for the MCP OAuth popup callback. On success, closes the popup and
 * injects a synthetic "connected" user turn so the agent picks up the new MCP
 * tools on the next stream. On failure, renders an error page in the popup.
 */
export function createMcpOAuthCallbackHandler(
  agent: DisputeAgentType,
): (result: McpOAuthResult) => Response {
  return (result) => {
    if (result.authSuccess) {
      const serverName = agent.getMcpServers().servers[result.serverId]?.name ?? 'the data source'
      agent.signalMcpConnected({ serverId: result.serverId, serverName })
      agent.scheduleNextMcpOAuthRefresh()
      return new Response('<script>window.close();</script>', {
        headers: { 'content-type': 'text/html' },
      })
    }
    const message = result.authError ?? 'authorization failed'
    return new Response(
      `<p>Authorization failed: ${escapeHtml(message)}</p><p>You can close this window and try again from the chat.</p>`,
      { status: 400, headers: { 'content-type': 'text/html' } },
    )
  }
}
