import type { McpOAuthTokenSchedule } from '@server/infrastructure/agents/mcp-oauth'

// Refresh tokens 24h before expiry. For short-lived tokens (1h), this
// collapses to "refresh immediately" on the next alarm cycle. For long-lived
// tokens (7d+), gives a full day of headroom.
// Currently a single attempt (with 2 retries) — no alarm-level retries on failure.
export const MCP_OAUTH_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000
// Stable per-server jitter (0–15min) to spread refresh calls across servers.
export const MCP_OAUTH_REFRESH_JITTER_MS = 15 * 60 * 1000

export function computeMcpOAuthRefreshAt(serverId: string, expiresAt: Date): Date {
  return new Date(
    expiresAt.getTime() - MCP_OAUTH_REFRESH_WINDOW_MS + stableMcpOAuthRefreshJitter(serverId),
  )
}

export function computeNextMcpOAuthRefreshAt(
  schedule: McpOAuthTokenSchedule,
  now = new Date(),
): Date | null {
  let nextAt: Date | null = null

  for (const [serverId, expiresAt] of Object.entries(schedule.servers)) {
    const refreshAt = computeMcpOAuthRefreshAt(serverId, new Date(expiresAt))
    const earliestAt = refreshAt < now ? now : refreshAt

    if (!nextAt || earliestAt < nextAt) {
      nextAt = earliestAt
    }
  }

  return nextAt
}

export function selectDueMcpOAuthRefreshServerIds(
  schedule: McpOAuthTokenSchedule,
  now = new Date(),
): string[] {
  return Object.entries(schedule.servers)
    .filter(
      ([serverId, expiresAt]) =>
        computeMcpOAuthRefreshAt(serverId, new Date(expiresAt)).getTime() <= now.getTime(),
    )
    .map(([serverId]) => serverId)
}

function stableMcpOAuthRefreshJitter(serverId: string): number {
  let hash = 0
  for (let i = 0; i < serverId.length; i += 1) {
    hash = (hash * 31 + serverId.charCodeAt(i)) >>> 0
  }
  return hash % MCP_OAUTH_REFRESH_JITTER_MS
}
