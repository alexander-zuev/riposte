import type { DisputeAgentType } from '@server/infrastructure/agents/dispute-agent'
import { DurableObjectOAuthClientProvider } from 'agents'

const MCP_OAUTH_CLIENT_NAME = 'Riposte'

export class RiposteMcpOAuthProvider extends DurableObjectOAuthClientProvider {
  get clientMetadata() {
    return {
      ...super.clientMetadata,
      client_name: MCP_OAUTH_CLIENT_NAME,
    }
  }
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
      // Fire-and-forget: the popup must close fast, but the synthetic user
      // message + agent turn run in the background. The open chat WebSocket
      // keeps the DO alive long enough for the agent's response to stream.
      agent.signalMcpConnected({ serverId: result.serverId, serverName })
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
