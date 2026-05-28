import {
  EntityNotFoundError,
  InternalServerError,
  PLAYBOOK_MD_MAX_LENGTH,
  PlaybookEditError,
  RevisionConflictError,
  SERVICE_START_RULES,
  STRIPE_EVIDENCE_TEXT_MAX_LENGTH,
  createCommand,
  createQuery,
  type ProductSetupState,
} from '@riposte/core'
import { resultToAgentToolResponse } from '@server/infrastructure/agents/agent-tool-result'
import type { DisputeAgentType } from '@server/infrastructure/agents/dispute-agent'
import { tool, type ToolSet } from 'ai'
import { Result } from 'better-result'
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

const productEvidenceFieldsSchema = z.object({
  productDescription: z.string().trim().min(1).max(STRIPE_EVIDENCE_TEXT_MAX_LENGTH),
  serviceStartRule: z.enum(SERVICE_START_RULES),
  refundPolicyDisclosure: z.string().trim().min(1).max(STRIPE_EVIDENCE_TEXT_MAX_LENGTH),
  cancellationPolicyDisclosure: z.string().trim().min(1).max(STRIPE_EVIDENCE_TEXT_MAX_LENGTH),
})

export const DISPUTE_AGENT_COMMON_TOOL_NAMES = [
  'readProductSetupSnapshot',
  'connectMcpServer',
  'listMcpServers',
  'fetchUrl',
  'webSearch',
  'reportUnknownTool',
] as const

export const DISPUTE_AGENT_CONNECT_APP_DATA_TOOL_NAMES = ['registerAppDataSource'] as const
export const DISPUTE_AGENT_PLAYBOOK_TOOL_NAMES = [
  'saveProductEvidenceFields',
  'readPlaybook',
  'writePlaybook',
  'editPlaybook',
] as const
export const DISPUTE_AGENT_EVIDENCE_TOOL_NAMES = [
  'readDisputeCaseMessages',
  'completeDisputeEvidenceCollection',
] as const
export const DISPUTE_AGENT_DRY_RUN_TOOL_NAMES = ['startDryRun'] as const

export type BuiltDisputeAgentTools = {
  tools: ToolSet
  activeTools: string[]
}

/**
 * Internal repair fallback shared by every dispute-agent surface (chat and the
 * background evidence-collection fiber). `experimental_repairToolCall` rewrites
 * any `NoSuchToolError` to this tool name, so it MUST be registered wherever the
 * repair runs — otherwise the redirect itself throws a second `NoSuchToolError`.
 */
const reportUnknownTool = tool({
  description:
    'INTERNAL fallback. Do not call directly. The agent runtime redirects calls to non-existent tools here so the model can see what went wrong and pick a real tool next step.',
  inputSchema: z.object({
    attemptedToolName: z.string(),
    availableTools: z.array(z.string()),
  }),
  execute: async ({ attemptedToolName, availableTools }) => ({
    error: `Tool "${attemptedToolName}" does not exist. Pick one from: ${availableTools.join(', ')}.`,
  }),
})

/**
 * Static product setup tools, merged with MCP tools from the connected servers.
 * `onChatMessage` waits for MCP connections before this builder runs so
 * programmatic `saveMessages()` turns after OAuth see freshly discovered tools.
 */
export function buildDisputeAgentTools({
  agent,
  storage,
  setup,
}: {
  agent: DisputeAgentType
  storage: DurableObjectStorage
  setup: ProductSetupState | null
}): BuiltDisputeAgentTools {
  const tools = {
    ...agent.mcp.getAITools(),
    readProductSetupSnapshot: tool({
      description:
        'Read the authoritative setup snapshot for this product. Use when the merchant says they completed an external setup step, after OAuth callbacks, after reconnects, or when the injected setup snapshot might be stale. The result includes `snapshotAt`; if it is newer than the prompt `snapshot_at`, treat it as the current state.',
      inputSchema: z.object({}),
      execute: async () => {
        const query = createQuery('ReadProductSetupSnapshot', {
          userId: agent.getCurrentUserId(),
          productId: agent.name,
        })
        const result = await agent.deps.services.messageBus().handle(query)
        return resultToAgentToolResponse(result)
      },
    }),
    readDisputeCaseMessages: tool({
      description:
        'Read persisted agent activity messages for a dispute case. Use this to inspect previous evidence-collection steps for the current dispute before continuing or retrying work.',
      inputSchema: z.object({
        disputeCaseId: z.string().min(1),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      execute: async ({ disputeCaseId, limit = 50 }) => {
        const query = createQuery('GetDisputeCaseActivity', {
          productId: agent.name,
          disputeCaseId,
          limit,
        })
        const result = await agent.deps.services.messageBus().handle(query)
        return resultToAgentToolResponse(result)
      },
    }),
    completeDisputeEvidenceCollection: tool({
      description:
        'Mark dispute evidence collection complete after the agent has persisted the required collected evidence. Call this exactly once at the end of a successful evidence-collection run.',
      inputSchema: z.object({
        disputeCaseId: z.string().min(1),
      }),
      execute: async ({ disputeCaseId }) => {
        const command = createCommand(
          'CompleteDisputeEvidenceCollection',
          { disputeCaseId },
          `agent:${agent.name}:collect-evidence:${disputeCaseId}:complete`,
        )
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result)
      },
    }),
    // TODO(dry-run): swap synthetic case for Stripe test-mode dispute (slice 5);
    // delete the synthetic-builder block in dispute-dry-run-handler.ts at the same time.
    startDryRun: tool({
      description:
        'Start a dry run of dispute defense for this product. Creates a synthetic dispute case and triggers the evidence-collection loop against it. ' +
        'Use this once the merchant has saved their playbook and confirms they want to see the agent in action. ' +
        'The run progress appears in the Activity tab. Returns the synthetic dispute case id and fiber id.',
      inputSchema: z.object({}),
      execute: async () => {
        const command = createCommand('StartDryRun', { productId: agent.name })
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result)
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
        const result = await Result.tryPromise({
          try: async () => {
            const { servers } = agent.getMcpServers()
            const existing = Object.entries(servers).find(([, s]) => s.server_url === url)
            if (existing) {
              const [id, server] = existing
              switch (server.state) {
                case 'ready':
                  return { state: 'ready', id }
                case 'connecting':
                case 'connected':
                case 'discovering': {
                  // In-flight handshake — wait for it instead of kicking.
                  await agent.mcp.waitForConnections({ timeout: 5000 })
                  const after = agent.getMcpServers().servers[id]
                  if (after?.state === 'ready') {
                    return { state: 'ready', id }
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
            const added = await agent.addMcpServer(name, url, { agentsPrefix: 'api/agents' })
            if (added.state === 'authenticating') {
              return { state: 'authenticating', authUrl: added.authUrl }
            }
            return { state: 'ready', id: added.id }
          },
          catch: () => new InternalServerError({ message: 'Failed to connect MCP server' }),
        })
        return resultToAgentToolResponse(result)
      },
    }),
    listMcpServers: tool({
      description:
        'List connected MCP servers with their internal server ids, display names, URLs, and connection states. Use this after an OAuth connection event when you need the server id for readiness checks or app data registration.',
      inputSchema: z.object({}),
      execute: async () => {
        const { servers } = agent.getMcpServers()
        const result = Result.ok({
          servers: Object.entries(servers).map(([id, server]) => ({
            id,
            name: server.name,
            url: server.server_url,
            state: server.state,
          })),
        })
        return resultToAgentToolResponse(result)
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
          const result = Result.ok({
            ready: false,
            reason: readyServer.reason,
            retryable: readyServer.retryable,
            message: readyServer.message,
            ...(readyServer.reason === 'not_ready' ? { state: readyServer.state } : {}),
          })
          return resultToAgentToolResponse(result)
        }
        const command = createCommand('RegisterProductAppDataSource', {
          productId: agent.name,
          mcpServerId: serverId,
          alias,
        })
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result, {
          ok: (value) => ({
            productAppDataSourceId: value.productAppDataSourceId,
            serverName: readyServer.serverName,
            alias,
          }),
        })
      },
    }),
    saveProductEvidenceFields: tool({
      description:
        'Save merchant-approved product evidence fields used by deterministic Stripe evidence packet generation: product description, service date derivation rule, refund policy disclosure, and cancellation policy disclosure. Use only after presenting the drafted fields to the merchant and receiving approval.',
      inputSchema: productEvidenceFieldsSchema,
      execute: async (fields) => {
        const command = createCommand('UpdateProduct', {
          userId: agent.getCurrentUserId(),
          productId: agent.name,
          ...fields,
        })
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result, { ok: () => fields })
      },
    }),
    readPlaybook: tool({
      description:
        'Read the current dispute playbook for this product. Returns the markdown `content`, its `revision` number, and a `validation` report (`complete` plus a `remaining` checklist of sections still missing, too short, or lacking a Source line). If no playbook exists yet it returns an error — create one with writePlaybook. Pass the returned `revision` as `baseRevision` to editPlaybook.',
      inputSchema: z.object({}),
      execute: async () => {
        const query = createQuery('ReadDisputePlaybook', {
          userId: agent.getCurrentUserId(),
          productId: agent.name,
        })
        const result = await agent.deps.services.messageBus().handle(query)
        return resultToAgentToolResponse(result, {
          err: (error) =>
            EntityNotFoundError.is(error)
              ? {
                  ok: false,
                  error: 'not_found',
                  message: 'No playbook yet. Use writePlaybook to create the first revision.',
                }
              : undefined,
        })
      },
    }),
    writePlaybook: tool({
      description:
        'Create the dispute playbook (its first revision) from the full markdown `content` drafted with the merchant. Use once, when no playbook exists; afterwards use editPlaybook for every change. Returns the new `revision` and a `validation` report of what still needs work.',
      inputSchema: z.object({
        content: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
      }),
      execute: async ({ content }) => {
        const command = createCommand('WriteDisputePlaybook', {
          userId: agent.getCurrentUserId(),
          productId: agent.name,
          content,
        })
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result)
      },
    }),
    editPlaybook: tool({
      description:
        'Apply a find-and-replace edit to the existing playbook. `baseRevision` must be the latest revision you read (stale edits are rejected). `old` must locate exactly one place in the current content (whitespace-tolerant). Returns the new `revision` and a `validation` report. On `revision_conflict` re-read with readPlaybook; on `edit_not_found`/`edit_ambiguous` adjust `old` and retry.',
      inputSchema: z.object({
        baseRevision: z.number().int().positive(),
        old: z.string().min(1),
        new: z.string().max(PLAYBOOK_MD_MAX_LENGTH),
      }),
      execute: async ({ baseRevision, old, new: replacement }) => {
        const command = createCommand('EditDisputePlaybook', {
          userId: agent.getCurrentUserId(),
          productId: agent.name,
          baseRevision,
          old,
          new: replacement,
        })
        const result = await agent.deps.services.messageBus().handle(command)
        return resultToAgentToolResponse(result, {
          err: (error) => {
            if (RevisionConflictError.is(error)) {
              return {
                ok: false,
                error: 'revision_conflict',
                currentRevision: error.currentRevision,
                message: error.message,
              }
            }
            if (PlaybookEditError.is(error)) {
              return {
                ok: false,
                error: error.kind,
                matchCount: error.matchCount,
                message: error.message,
              }
            }
            return undefined
          },
        })
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
        const jina = agent.deps.services.jinaClient()
        const result = await Result.gen(async function* () {
          const key = `${FETCH_CACHE_PREFIX}${url}`
          let cached = await storage.get<CachedFetchDoc>(key)
          if (!cached || cached.expiresAt < Date.now()) {
            const fetched = yield* Result.await(jina.fetchUrl({ url }))
            cached = {
              url: fetched.url,
              title: fetched.title,
              content: fetched.content,
              expiresAt: Date.now() + FETCH_CACHE_TTL_MS,
            }
            await storage.put(key, cached)
          }
          const chunk = cached.content.slice(offset, offset + FETCH_CHUNK_SIZE)
          const nextOffset = offset + chunk.length
          return Result.ok({
            url: cached.url,
            title: cached.title,
            content: chunk,
            totalChars: cached.content.length,
            nextOffset: nextOffset < cached.content.length ? nextOffset : null,
          })
        })
        return resultToAgentToolResponse(result)
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
        const jina = agent.deps.services.jinaClient()
        const result = await jina.webSearch({ query, numResults })
        return resultToAgentToolResponse(result)
      },
    }),
    reportUnknownTool,
  }
  const activeTools = deriveActiveDisputeAgentTools({ tools, setup })
  return {
    tools,
    activeTools: activeTools,
  }
}

/**
 * Tools for the background evidence-collection fiber. Distinct from chat:
 * - `completeEvidenceCollection` takes no args and captures `disputeCaseId`
 *   from the closure, so the agent cannot complete the wrong case
 * - Includes MCP read tools (merchant DB, etc) so the agent can gather facts
 * - Includes the shared `reportUnknownTool` repair fallback so the loop's
 *   `experimental_repairToolCall` redirect resolves here instead of throwing a
 *   second `NoSuchToolError` when the model invents a tool
 * - No setup/playbook mutation tools (those belong to chat)
 *
 * Same file as `buildDisputeAgentTools` so shared helpers stay reachable;
 * the two are independent contracts otherwise.
 *
 * TODO(tools): the v1 set is intentionally tiny (MCP + completion). Expand
 * with: a typed `getDisputeCaseDetails(disputeCaseId)` lookup, Stripe-read
 * tools (charge/customer/transaction history), and the merchant-evidence
 * write tool. Each addition needs its own description + schema, not a
 * blanket import from chat.
 * TODO(idempotency): the completion command's idempotency key only dedupes
 * per case; if a single case has multiple runs across days, this collapses
 * them. Decide whether to include `runId` in the key once we have a
 * `dispute_evidence_runs` table.
 */
export function buildEvidenceCollectionTools({
  agent,
  disputeCaseId,
}: {
  agent: DisputeAgentType
  disputeCaseId: string
}): BuiltDisputeAgentTools {
  const tools: ToolSet = {
    ...agent.mcp.getAITools(),
    reportUnknownTool,
    completeEvidenceCollection: tool({
      description:
        'Call exactly once when you have collected sufficient evidence or cannot make further progress. ' +
        'Ends the run and advances the workflow. Always call this — never just stop.',
      inputSchema: z.object({
        reason: z.string().min(1).describe('One-line summary of why collection is complete'),
      }),
      execute: async ({ reason }) => {
        const command = createCommand(
          'CompleteDisputeEvidenceCollection',
          { disputeCaseId },
          `agent:${agent.name}:collect-evidence:${disputeCaseId}:complete`,
        )
        const result = await agent.deps.services.messageBus().handle(command)
        return result.match({
          ok: () => ({ completed: true, reason, error: null as string | null }),
          err: (error) => ({ completed: false, reason, error: error.message as string | null }),
        })
      },
    }),
  }

  return {
    tools,
    activeTools: Object.keys(tools),
  }
}

export function deriveActiveDisputeAgentTools({
  tools,
  setup,
}: {
  tools: ToolSet
  setup: ProductSetupState | null
}): string[] {
  const allToolNames = Object.keys(tools)
  if (!setup) return allToolNames

  const active = new Set<string>()
  const addToolNames = (names: readonly string[]) => {
    for (const name of names) active.add(name)
  }
  const addMcpToolNames = () => {
    for (const name of allToolNames) {
      if (name.startsWith('tool_')) active.add(name)
    }
  }

  addMcpToolNames()
  addToolNames(DISPUTE_AGENT_COMMON_TOOL_NAMES)

  switch (setup.currentStep) {
    case 'add_product':
    case 'connect_stripe':
      break
    case 'connect_app_data':
      addToolNames(DISPUTE_AGENT_CONNECT_APP_DATA_TOOL_NAMES)
      break
    case 'playbook':
      addToolNames(DISPUTE_AGENT_CONNECT_APP_DATA_TOOL_NAMES)
      addToolNames(DISPUTE_AGENT_PLAYBOOK_TOOL_NAMES)
      break
    case 'dry_run':
      addToolNames(DISPUTE_AGENT_CONNECT_APP_DATA_TOOL_NAMES)
      addToolNames(DISPUTE_AGENT_PLAYBOOK_TOOL_NAMES)
      addToolNames(DISPUTE_AGENT_DRY_RUN_TOOL_NAMES)
      break
    case 'review':
    case null:
      addToolNames(DISPUTE_AGENT_CONNECT_APP_DATA_TOOL_NAMES)
      addToolNames(DISPUTE_AGENT_PLAYBOOK_TOOL_NAMES)
      addToolNames(DISPUTE_AGENT_DRY_RUN_TOOL_NAMES)
      break
    default:
      break
  }

  return allToolNames.filter((name) => active.has(name))
}
