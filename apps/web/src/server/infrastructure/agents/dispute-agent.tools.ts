import { createCommand } from '@riposte/core'
import type { DisputeAgentType } from '@server/infrastructure/agents/dispute-agent'
import { tool, type ToolSet } from 'ai'
import { z } from 'zod'

/** Max chars returned per fetchUrl call. Guards the 256k Gemma context window. */
const FETCH_CHUNK_SIZE = 8000
/** Cache TTL for paged fetch documents in DO storage. */
const FETCH_CACHE_TTL_MS = 60 * 60 * 1000
/** DO storage key prefix for paged fetch documents. Avoids MCP/auth key collision. */
const FETCH_CACHE_PREFIX = '/fetch-cache/'

type CachedFetchDoc = {
  url: string
  title: string
  content: string
  expiresAt: number
}

const appDataSourceAliasSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_]*$/)

/**
 * Static onboarding tools, merged with MCP tools from the connected servers.
 * `onChatMessage` waits for MCP connections before this builder runs so
 * programmatic `saveMessages()` turns after OAuth see freshly discovered tools.
 */
export function buildDisputeAgentTools(
  agent: DisputeAgentType,
  storage: DurableObjectStorage,
): ToolSet {
  const jina = agent.deps.services.jinaClient()

  return {
    ...agent.mcp.getAITools(),
    readOnboardingState: tool({
      description:
        'Read the authoritative onboarding state for this product. Use when the merchant says they completed an external setup step, after OAuth callbacks, after reconnects, or when the injected setup snapshot might be stale. The result includes `snapshotAt`; if it is newer than the prompt `snapshot_at`, treat it as the current state.',
      inputSchema: z.object({}),
      execute: async () => {
        const userId = agent.getCurrentUserId()

        const db = agent.deps.db()
        const product = await agent.deps.repos.products(db).findById(agent.name)
        if (product.isErr()) {
          return { ok: false as const, error: product.error.message }
        }
        if (!product.value) {
          return { ok: false as const, error: 'Product was not found.' }
        }

        const setup = await agent.deps.services.productSetup().getState({
          userId,
          productId: agent.name,
        })
        if (setup.isErr()) {
          return { ok: false as const, error: setup.error.message }
        }

        const stripeConnection = await agent.deps.repos
          .stripeConnections(db)
          .findByProductId(agent.name)
        if (stripeConnection.isErr()) {
          return { ok: false as const, error: stripeConnection.error.message }
        }

        const appDataSources = await agent.deps.repos
          .productAppDataSources(db)
          .findByProductId(agent.name)
        if (appDataSources.isErr()) {
          return { ok: false as const, error: appDataSources.error.message }
        }

        const latestPlaybook = await agent.deps.repos
          .disputePlaybooks(db)
          .findLatestForProduct(agent.name)
        if (latestPlaybook.isErr()) {
          return { ok: false as const, error: latestPlaybook.error.message }
        }

        const productSnapshot = product.value.serialize()
        const stripeSnapshot = stripeConnection.value?.serialize() ?? null
        const playbook = latestPlaybook.value

        return {
          ok: true as const,
          snapshotAt: setup.value.snapshotAt,
          product: {
            id: productSnapshot.id,
            productName: productSnapshot.productName,
            url: productSnapshot.url,
            productType: productSnapshot.productType,
            status: productSnapshot.status,
            productDescription: productSnapshot.productDescription,
            serviceStartRule: productSnapshot.serviceStartRule,
            refundPolicyDisclosure: productSnapshot.refundPolicyDisclosure,
            cancellationPolicyDisclosure: productSnapshot.cancellationPolicyDisclosure,
            updatedAt: productSnapshot.updatedAt.toISOString(),
          },
          setup: setup.value,
          stripe: {
            connected: stripeSnapshot?.status === 'active',
            livemode: stripeSnapshot?.livemode ?? null,
            stripeAccountId: stripeSnapshot?.stripeAccountId ?? null,
            status: stripeSnapshot?.status ?? 'missing',
            updatedAt: stripeSnapshot?.updatedAt.toISOString() ?? null,
          },
          appDataSources: appDataSources.value.map((source) => {
            const snapshot = source.serialize()
            return {
              id: snapshot.id,
              alias: snapshot.alias,
              mcpServerId: snapshot.mcpServerId,
              createdAt: snapshot.createdAt.toISOString(),
            }
          }),
          playbook: {
            exists: playbook !== null,
            version: playbook?.version ?? null,
            createdAt: playbook?.createdAt.toISOString() ?? null,
          },
        }
      },
    }),

    connectMcpServer: tool({
      description:
        'Connect a Model Context Protocol (MCP) server so we can use its tools to find evidence proofs (e.g., the merchant\'s database for user activity). Provide a memorable `name` and the MCP server `url` you discovered via webSearch/fetchUrl. Prefer explaining the server you found and asking the merchant before connecting. If the server needs OAuth, returns `state: "authenticating"` with an `authUrl` — surface that to the merchant as a clickable markdown link so they can authorize. After authorization, you will be notified automatically and can continue without waiting for the merchant to type anything.',
      inputSchema: z.object({
        name: z.string().min(1).max(50),
        url: z.url(),
      }),
      execute: async ({ name, url }) => {
        const { servers } = agent.getMcpServers()
        const existing = Object.entries(servers).find(([, s]) => s.server_url === url)

        if (existing) {
          const [id, server] = existing
          switch (server.state) {
            case 'ready':
              return { ok: true as const, state: 'ready', id }
            case 'connecting':
            case 'connected':
            case 'discovering': {
              // In-flight handshake — wait for it instead of kicking.
              await agent.mcp.waitForConnections({ timeout: 5000 })
              const after = agent.getMcpServers().servers[id]
              if (after?.state === 'ready') {
                return { ok: true as const, state: 'ready', id }
              }
              await agent.removeMcpServer(id)
              break
            }
            case 'authenticating':
            case 'failed':
            default:
              // Auth flow likely abandoned (stale state, expired link) or broken.
              // Fresh reconnect is the right retry semantic.
              await agent.removeMcpServer(id)
              break
          }
        }

        // `agentsPrefix` must match the catchall route's `prefix: 'api/agents'`
        // (routes/api/agents/$.ts); without it the SDK builds a 404'ing redirect_uri.
        const result = await agent.addMcpServer(name, url, { agentsPrefix: 'api/agents' })
        if (result.state === 'authenticating') {
          return { ok: true as const, state: 'authenticating', authUrl: result.authUrl }
        }
        return { ok: true as const, state: 'ready', id: result.id }
      },
    }),

    listMcpServers: tool({
      description:
        'List connected MCP servers with their internal server ids, display names, URLs, and connection states. Use this after an OAuth connection event when you need the server id for readiness checks or app data registration.',
      inputSchema: z.object({}),
      execute: async () => {
        const { servers } = agent.getMcpServers()
        return {
          ok: true as const,
          servers: Object.entries(servers).map(([id, server]) => ({
            id,
            name: server.name,
            url: server.server_url,
            state: server.state,
          })),
        }
      },
    }),

    registerAppDataSource: tool({
      description:
        'Register a ready MCP server as a merchant app data source for this product. Use only after the MCP server is authorized, ready, represents merchant-owned app/customer/usage data, and you have successfully made one harmless read-only call with its MCP tools. Do not use for Stripe. `serverId` must be the internal MCP server id from listMcpServers or connectMcpServer, not the display name. Choose a stable snake_case alias such as `primary_db`, `usage_db`, or `support_tool`; the alias may be referenced by future playbooks.',
      inputSchema: z.object({
        serverId: z.string().min(1),
        alias: appDataSourceAliasSchema,
      }),
      execute: async ({ serverId, alias }) => {
        const readyServer = await agent.getReadyMcpServer(serverId)
        if (!readyServer.ok) {
          return readyServer
        }

        const command = createCommand('RegisterProductAppDataSource', {
          productId: agent.name,
          mcpServerId: serverId,
          alias,
        })
        const registered = await agent.deps.services.messageBus().handle(command)
        if (registered.isErr()) {
          return { ok: false as const, error: registered.error.message }
        }

        return {
          ok: true as const,
          productAppDataSourceId: registered.value.productAppDataSourceId,
          serverName: readyServer.serverName,
          alias,
        }
      },
    }),

    fetchUrl: tool({
      description:
        'Fetch a URL as markdown. Returns a chunk (8000 chars max) starting at `offset` (default 0), plus `nextOffset` to continue reading. Call again with the same `url` and `offset = nextOffset` to page through long pages. `nextOffset` is null when no more content remains. Cached for 60min per URL; re-fetched if expired.',
      inputSchema: z.object({
        url: z.url(),
        offset: z.number().int().min(0).optional(),
      }),
      execute: async ({ url, offset = 0 }) => {
        const key = `${FETCH_CACHE_PREFIX}${url}`
        let cached = await storage.get<CachedFetchDoc>(key)
        if (!cached || cached.expiresAt < Date.now()) {
          const fetched = await jina.fetchUrl({ url })
          if (fetched.isErr()) {
            return { ok: false as const, error: fetched.error.message }
          }
          cached = {
            url: fetched.value.url,
            title: fetched.value.title,
            content: fetched.value.content,
            expiresAt: Date.now() + FETCH_CACHE_TTL_MS,
          }
          await storage.put(key, cached)
        }
        const chunk = cached.content.slice(offset, offset + FETCH_CHUNK_SIZE)
        const nextOffset = offset + chunk.length
        return {
          ok: true as const,
          url: cached.url,
          title: cached.title,
          content: chunk,
          totalChars: cached.content.length,
          nextOffset: nextOffset < cached.content.length ? nextOffset : null,
        }
      },
    }),

    webSearch: tool({
      description:
        'Search the web for open-ended discovery. Returns SERP entries (title, URL, description) without page contents — call fetchUrl on a promising result if you need to read it. Use for finding an MCP server URL or unknown docs page; do not use when the exact URL is already known.',
      inputSchema: z.object({
        query: z.string().min(1),
        numResults: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, numResults }) => {
        const result = await jina.webSearch({ query, numResults })
        if (result.isErr()) {
          return { ok: false as const, error: result.error.message }
        }
        return { ok: true as const, results: result.value.results }
      },
    }),
  }
}
