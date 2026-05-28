import {
  discoverOAuthServerInfo,
  refreshAuthorization,
  selectResourceURL,
} from '@modelcontextprotocol/sdk/client/auth.js'
import {
  ServerError,
  TemporarilyUnavailableError,
  TooManyRequestsError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js'
import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import { createEvent, createLogger, McpOAuthRefreshError } from '@riposte/core'
import type { DisputeAgentType } from '@server/infrastructure/agents/dispute-agent'
import {
  computeNextMcpOAuthRefreshAt,
  selectDueMcpOAuthRefreshServerIds,
} from '@server/infrastructure/agents/mcp-oauth-refresh'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { DurableObjectOAuthClientProvider } from 'agents'
import { Result } from 'better-result'

const logger = createLogger('mcp-oauth')

const MCP_OAUTH_CLIENT_NAME = 'Riposte'
export const MCP_OAUTH_REFRESH_RETRY_DELAY_MS = 15 * 60 * 1000
export const MCP_OAUTH_TOKEN_SCHEDULE_KEY = 'riposte:mcp_oauth_token_schedule:v1'

type McpServerId = string
type ISODateString = string

export type McpOAuthTokenSchedule = {
  servers: Record<McpServerId, ISODateString>
}

export interface IMcpOAuthService {
  saveTokenExpiry(serverId: string, tokens: OAuthTokens, now?: Date): Promise<void>
  removeTokenExpiry(serverId: string): Promise<void>
  scheduleTokenRefreshAt(serverId: string, refreshAt: Date): Promise<void>
  loadTokenSchedule(): Promise<McpOAuthTokenSchedule | null>
  computeNextRefreshAt(now?: Date): Promise<Date | null>
  refreshDueTokens(now?: Date): Promise<void>
}

type McpOAuthServiceDeps = {
  storage: DurableObjectStorage
  productId: string
  queueClient: () => IQueueClient
}

type StoredMcpServerRow = {
  id: string
  name: string
  server_url: string
  client_id: string | null
  auth_url: string | null
  callback_url: string
  server_options: string | null
}

export class McpOAuthService implements IMcpOAuthService {
  constructor(private readonly deps: McpOAuthServiceDeps) {}

  async saveTokenExpiry(serverId: string, tokens: OAuthTokens, now = new Date()): Promise<void> {
    const schedule = (await this.loadTokenSchedule()) ?? { servers: {} }
    const expiresInSeconds = tokens.expires_in

    if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds)) {
      logger.warn('mcp_oauth_token_missing_expires_in', { serverId })
      // Tokens without expires_in are usable, but cannot drive proactive refresh scheduling.
      await this.removeTokenExpiry(serverId)
      return
    }

    schedule.servers[serverId] = new Date(now.getTime() + expiresInSeconds * 1000).toISOString()
    await this.saveTokenSchedule(schedule)
  }

  async removeTokenExpiry(serverId: string): Promise<void> {
    const schedule = await this.loadTokenSchedule()
    if (!schedule) return
    const servers = Object.fromEntries(
      Object.entries(schedule.servers).filter(([storedServerId]) => storedServerId !== serverId),
    )
    await this.saveTokenSchedule({ servers })
  }

  async scheduleTokenRefreshAt(serverId: string, refreshAt: Date): Promise<void> {
    const schedule = (await this.loadTokenSchedule()) ?? { servers: {} }
    schedule.servers[serverId] = refreshAt.toISOString()
    await this.saveTokenSchedule(schedule)
  }

  async loadTokenSchedule(): Promise<McpOAuthTokenSchedule | null> {
    const stored = await this.deps.storage.get<McpOAuthTokenSchedule>(MCP_OAUTH_TOKEN_SCHEDULE_KEY)
    if (!stored || typeof stored !== 'object' || !stored.servers) {
      return null
    }
    return stored
  }

  async computeNextRefreshAt(now = new Date()): Promise<Date | null> {
    const schedule = await this.loadTokenSchedule()
    if (!schedule) return null
    return computeNextMcpOAuthRefreshAt(schedule, now)
  }

  async refreshDueTokens(now = new Date()): Promise<void> {
    const schedule = await this.loadTokenSchedule()
    if (!schedule) return

    const serverIds = selectDueMcpOAuthRefreshServerIds(schedule, now)

    for (const serverId of serverIds) {
      // Intentional: each refresh mutates the shared schedule index.
      // eslint-disable-next-line no-await-in-loop
      await this.refreshToken(serverId)
    }
  }

  private async saveTokenSchedule(schedule: McpOAuthTokenSchedule): Promise<void> {
    await this.deps.storage.put(MCP_OAUTH_TOKEN_SCHEDULE_KEY, schedule)
  }

  private async refreshToken(serverId: string): Promise<void> {
    const server = this.getStoredServer(serverId)
    if (!server) {
      await this.removeTokenExpiry(serverId)
      return
    }

    if (!server.client_id) {
      logger.warn('mcp_oauth_refresh_no_client_id', {
        serverId,
        productId: this.deps.productId,
      })
      await this.emitRefreshFailed(serverId)
      return
    }

    const provider = this.createProvider(server, server.client_id)

    const [tokens, clientInformation] = await Promise.all([
      provider.tokens(),
      provider.clientInformation(),
    ])

    const refreshToken = tokens?.refresh_token
    if (!refreshToken || !clientInformation) {
      logger.warn('mcp_oauth_refresh_missing_credentials', {
        serverId,
        productId: this.deps.productId,
      })
      await this.emitRefreshFailed(serverId)
      return
    }

    const result = await Result.tryPromise(
      {
        try: async () => {
          const info = await discoverOAuthServerInfo(server.server_url, { fetchFn: fetch })
          const resource = await selectResourceURL(
            server.server_url,
            provider,
            info.resourceMetadata,
          )
          const refreshed = await refreshAuthorization(info.authorizationServerUrl, {
            metadata: info.authorizationServerMetadata,
            clientInformation,
            refreshToken,
            resource,
            fetchFn: fetch,
          })
          await provider.saveTokens(refreshed)
        },
        catch: (cause) =>
          new McpOAuthRefreshError({
            cause,
            retryable: isRetryableMcpOAuthRefreshError(cause),
          }),
      },
      RETRY.externalApi,
    )

    if (!result.isErr()) {
      logger.debug('mcp_oauth_refresh_success', {
        serverId,
        productId: this.deps.productId,
      })
      return
    }

    if (result.error.retryable) {
      const retryAt = new Date(Date.now() + MCP_OAUTH_REFRESH_RETRY_DELAY_MS)
      logger.warn('mcp_oauth_refresh_retry_scheduled', {
        serverId,
        productId: this.deps.productId,
        retryAt: retryAt.toISOString(),
        cause: result.error.cause,
      })
      await this.scheduleTokenRefreshAt(serverId, retryAt)
      return
    }

    logger.warn('mcp_oauth_refresh_failed', {
      serverId,
      productId: this.deps.productId,
      cause: result.error.cause,
    })
    await this.emitRefreshFailed(serverId)
  }

  private async emitRefreshFailed(serverId: string): Promise<void> {
    await this.removeTokenExpiry(serverId)
    const event = createEvent('McpOAuthRefreshFailed', {
      productId: this.deps.productId,
      mcpServerId: serverId,
    })
    const sent = await this.deps.queueClient().send(event)
    if (sent.isErr()) {
      logger.error('mcp_oauth_refresh_failed_event_send_error', {
        serverId,
        productId: this.deps.productId,
        error: sent.error,
      })
    }
  }

  private getStoredServer(serverId: string): StoredMcpServerRow | null {
    const rows = this.deps.storage.sql
      .exec<StoredMcpServerRow>(
        `
          SELECT
            id,
            name,
            server_url,
            client_id,
            auth_url,
            callback_url,
            server_options
          FROM cf_agents_mcp_servers
          WHERE id = ?
        `,
        serverId,
      )
      .toArray()

    return rows[0] ?? null
  }

  private createProvider(server: StoredMcpServerRow, clientId: string): RiposteMcpOAuthProvider {
    const provider = new RiposteMcpOAuthProvider(
      this.deps.storage,
      this.deps.productId,
      server.callback_url,
      async (savedServerId, tokens, now) => this.saveTokenExpiry(savedServerId, tokens, now),
    )
    provider.serverId = server.id
    provider.clientId = clientId
    return provider
  }
}

export class RiposteMcpOAuthProvider extends DurableObjectOAuthClientProvider {
  constructor(
    storage: DurableObjectStorage,
    clientName: string,
    baseRedirectUrl: string,
    private readonly saveTokenExpiry: (
      serverId: string,
      tokens: OAuthTokens,
      now?: Date,
    ) => Promise<void> = async (serverId, tokens, now) =>
      setMcpOAuthTokenExpiry(storage, serverId, tokens, now),
  ) {
    super(storage, clientName, baseRedirectUrl)
  }

  get clientMetadata() {
    return {
      ...super.clientMetadata,
      client_name: MCP_OAUTH_CLIENT_NAME,
    }
  }

  override async saveTokens(tokens: OAuthTokens): Promise<void> {
    await super.saveTokens(tokens)
    await this.saveTokenExpiry(this.serverId, tokens)
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
    // Tokens without expires_in are usable, but cannot drive proactive refresh scheduling.
    await removeMcpOAuthTokenExpiry(storage, serverId)
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
  const servers = Object.fromEntries(
    Object.entries(schedule.servers).filter(([storedServerId]) => storedServerId !== serverId),
  )
  await saveMcpOAuthTokenSchedule(storage, { servers })
}

export function isRetryableMcpOAuthRefreshError(cause: unknown): boolean {
  if (isTransientError(cause)) return true
  if (cause instanceof ServerError) return true
  if (cause instanceof TemporarilyUnavailableError) return true
  if (cause instanceof TooManyRequestsError) return true

  return false
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
