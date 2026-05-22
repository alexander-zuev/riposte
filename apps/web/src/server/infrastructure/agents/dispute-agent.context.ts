export type DisputeAgentContextStatus = 'ok' | 'compact_required'

export type DisputeAgentCompactionState =
  | { status: 'idle' }
  | { status: 'compacting'; startedAt: string }
  | { status: 'failed'; failedAt: string; message: string }

export type DisputeAgentUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  updatedAt: string | null
}

/**
 * One of the categories a chat-completion model actually sees on input. Extend
 * the union explicitly if a new real category appears.
 *
 * Tools are split by source: `system_tools` are locally defined in
 * `buildDisputeAgentTools`, `mcp_tools` come from `this.mcp.getAITools()`.
 */
export type ContextCategory = 'system_prompt' | 'system_tools' | 'mcp_tools' | 'messages'

/**
 * Per-category share of the estimated input. `children` is used by the tools
 * row to expose per-tool token counts in the FE popover.
 */
export type ContextCategoryUsage = {
  label: string
  category: ContextCategory
  tokens: number
  children?: ContextCategoryUsage[]
}

/**
 * Server-computed estimate of what the next turn would feed the model, split
 * by category. Heuristic-based (chars/4 + word fudge); the trigger never reads
 * this — it reads real `usage.totalTokens`. This estimate exists for FE
 * visibility and offline calibration only.
 */
export type DisputeAgentEstimatedUsage = {
  byCategory: ContextCategoryUsage[]
  total: number
}

export type DisputeAgentContextState = {
  modelName: string
  windowTokens: number
  compactAtTokens: number
  status: DisputeAgentContextStatus
  compaction: DisputeAgentCompactionState
  usage: DisputeAgentUsage
  estimatedUsage: DisputeAgentEstimatedUsage
}

export const DISPUTE_AGENT_CONTEXT_WINDOW = 256_000
// TODO(context): restore after local compaction testing.
// export const DISPUTE_AGENT_COMPACT_THRESHOLD = 0.8
// export const DISPUTE_AGENT_COMPACT_AT_TOKENS = Math.floor(
//   DISPUTE_AGENT_CONTEXT_WINDOW * DISPUTE_AGENT_COMPACT_THRESHOLD,
// )
export const DISPUTE_AGENT_COMPACT_AT_TOKENS = 40_000

/**
 * Tool definitions tokenize denser than English prose (JSON brackets, quotes,
 * short property names land closer to ~3 chars/token vs ~4 for prose). Bump
 * the tools estimate by this factor to compensate. Calibrated empirically
 * against Gemma 4: 1.2 over-estimated by ~25%, 1.1 lands ratio closer to 1.0
 * while keeping a small safety margin over the heuristic.
 */
export const TOOLS_FUDGE_FACTOR = 1.1

export const INITIAL_USAGE: DisputeAgentUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  updatedAt: null,
}

export const INITIAL_ESTIMATED_USAGE: DisputeAgentEstimatedUsage = {
  byCategory: [],
  total: 0,
}

/** Fresh context state. Statics (modelName, windowTokens, compactAtTokens) are set once and preserved by spread thereafter. */
export function createInitialDisputeAgentContextState(modelName: string): DisputeAgentContextState {
  return {
    modelName,
    windowTokens: DISPUTE_AGENT_CONTEXT_WINDOW,
    compactAtTokens: DISPUTE_AGENT_COMPACT_AT_TOKENS,
    status: 'ok',
    compaction: { status: 'idle' },
    usage: INITIAL_USAGE,
    estimatedUsage: INITIAL_ESTIMATED_USAGE,
  }
}

/**
 * Partial updater for context state. Spreads `prev` and overrides only the
 * dynamic fields you pass; recomputes `status` from the (possibly new) usage
 * against the (preserved) threshold. Statics travel forward untouched.
 */
export function nextDisputeAgentContextState(
  prev: DisputeAgentContextState,
  patch: {
    usage?: DisputeAgentUsage
    compaction?: DisputeAgentCompactionState
    estimatedUsage?: DisputeAgentEstimatedUsage
  },
): DisputeAgentContextState {
  const usage = patch.usage ?? prev.usage
  const estimatedUsage = patch.estimatedUsage ?? prev.estimatedUsage
  // Trigger on the larger of last turn's real usage and the current estimate.
  // Estimate reflects post-turn changes (MCP connect, setup change) that real
  // usage won't capture until the next turn completes — so this catches "MCP
  // just added tools, status should flip now, not after the next overflow".
  return {
    ...prev,
    ...patch,
    usage,
    status: getDisputeAgentContextStatus({
      totalTokens: Math.max(usage.totalTokens, estimatedUsage.total),
      compactAtTokens: prev.compactAtTokens,
    }),
  }
}

export function getDisputeAgentContextStatus(args: {
  totalTokens: number
  compactAtTokens: number
}): DisputeAgentContextStatus {
  if (args.totalTokens >= args.compactAtTokens) return 'compact_required'
  return 'ok'
}

/**
 * Pure builder: turns the four deterministic sources of model input into a
 * per-category estimated usage the FE can render generically. `estimate*`
 * callers are injected so this file stays free of the SDK estimator import.
 *
 * Tools are split by source so the FE can show System tools and MCP tools as
 * separate summary rows. Both lists carry per-tool children for the popover.
 *
 * Messages strategy:
 *   - When `lastRealTotalTokens > 0`, derive messages from the real number:
 *     `messages = max(0, real − systemPrompt − systemTools − mcpTools)`. Anchors
 *     the row to a real model response (input + output, since the assistant
 *     reply is now part of `this.messages` and travels on the next call).
 *   - On turn 0 (no usage yet), fall back to `estimateMessages(messages)`.
 */
export function buildEstimatedUsage(args: {
  instructions: string
  systemTools: Record<string, unknown>
  mcpTools: Record<string, unknown>
  messages: ReadonlyArray<unknown>
  /**
   * Real total tokens (input + output) from the last completed turn, or 0 if
   * no turn has run yet. Anchors the messages bucket: after turn N, the
   * assistant reply is appended to messages, so the "what's in context" total
   * equals what the model billed for that turn end-to-end.
   */
  lastRealTotalTokens: number
  estimateString: (text: string) => number
  estimateMessages: (messages: ReadonlyArray<unknown>) => number
}): DisputeAgentEstimatedUsage {
  const systemPromptTokens = args.estimateString(args.instructions)

  const systemToolChildren = estimateToolChildren(
    args.systemTools,
    'system_tools',
    args.estimateString,
  )
  const mcpToolChildren = estimateToolChildren(args.mcpTools, 'mcp_tools', args.estimateString)
  const systemToolsTokens = sumTokens(systemToolChildren)
  const mcpToolsTokens = sumTokens(mcpToolChildren)

  const totalStaticTokens = systemPromptTokens + systemToolsTokens + mcpToolsTokens
  const messagesTokens =
    args.lastRealTotalTokens > 0
      ? Math.max(0, args.lastRealTotalTokens - totalStaticTokens)
      : args.estimateMessages(args.messages)

  const byCategory: ContextCategoryUsage[] = [
    { label: 'System prompt', category: 'system_prompt', tokens: systemPromptTokens },
    {
      label: 'System tools',
      category: 'system_tools',
      tokens: systemToolsTokens,
      children: systemToolChildren,
    },
    {
      label: 'MCP tools',
      category: 'mcp_tools',
      tokens: mcpToolsTokens,
      children: mcpToolChildren,
    },
    { label: 'Messages', category: 'messages', tokens: messagesTokens },
  ]

  return {
    byCategory,
    total: totalStaticTokens + messagesTokens,
  }
}

function estimateToolChildren(
  tools: Record<string, unknown>,
  category: ContextCategory,
  estimateString: (text: string) => number,
): ContextCategoryUsage[] {
  return Object.entries(tools)
    .map<ContextCategoryUsage>(([name, tool]) => {
      // Tool name is the key in the ToolSet record, not a property of the value.
      // Fold it into the stringified payload so the estimate matches what the
      // provider actually receives ({ name, description, input_schema }).
      const payload = JSON.stringify({ name, ...(tool as object) }) ?? ''
      return {
        label: name,
        category,
        tokens: Math.round(estimateString(payload) * TOOLS_FUDGE_FACTOR),
      }
    })
    .toSorted((a, b) => b.tokens - a.tokens)
}

function sumTokens(children: ContextCategoryUsage[]): number {
  return children.reduce((sum, child) => sum + child.tokens, 0)
}
