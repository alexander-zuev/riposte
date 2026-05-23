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
 * Local tool estimate decision:
 * We estimate tools from local AI SDK/Zod tool objects because the AI SDK does
 * not expose a stable provider-normalized tool payload here. That raw object is
 * larger than the function declarations counted by the provider, so we apply a
 * calibration factor instead of treating the raw stringify estimate as truth.
 *
 * Calibration method:
 * Compare provider-reported input tokens for the same product/model/prompt with
 * 0 active tools, 1 active tool, and all 9 local tools. The measured all-tool
 * overhead was ~1484 provider tokens versus a raw estimate of 3424, or ~0.43x.
 * Use 0.4 to keep the UI closer to observed reality while preserving that this
 * is still an estimate, not an exact tokenizer.
 */
export const SYSTEM_TOOLS_ESTIMATE_CALIBRATION = 0.4

/**
 * MCP tools arrive from the MCP client manager in a different shape than local
 * AI SDK/Zod tools. The local 0.4 calibration under-counted a PlanetScale MCP
 * toolset by ~41%, so keep MCP tools unscaled until calibrated separately.
 */
export const MCP_TOOLS_ESTIMATE_CALIBRATION = 1.0

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
 *     `messages = max(0, real − systemPrompt − systemTools − mcpTools)`. This
 *     anchors the row to provider usage once a turn has completed.
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
    SYSTEM_TOOLS_ESTIMATE_CALIBRATION,
  )
  const mcpToolChildren = estimateToolChildren(
    args.mcpTools,
    'mcp_tools',
    args.estimateString,
    MCP_TOOLS_ESTIMATE_CALIBRATION,
  )
  const systemToolInputTokens = sumTokens(systemToolChildren)
  const mcpToolInputTokens = sumTokens(mcpToolChildren)

  const systemAndToolInputTokens = systemPromptTokens + systemToolInputTokens + mcpToolInputTokens
  const messageInputTokens =
    args.lastRealTotalTokens > 0
      ? Math.max(0, args.lastRealTotalTokens - systemAndToolInputTokens)
      : args.estimateMessages(args.messages)

  const byCategory: ContextCategoryUsage[] = [
    { label: 'System prompt', category: 'system_prompt', tokens: systemPromptTokens },
    {
      label: 'System tools',
      category: 'system_tools',
      tokens: systemToolInputTokens,
      children: systemToolChildren,
    },
    {
      label: 'MCP tools',
      category: 'mcp_tools',
      tokens: mcpToolInputTokens,
      children: mcpToolChildren,
    },
    { label: 'Messages', category: 'messages', tokens: messageInputTokens },
  ]

  return {
    byCategory,
    total: systemAndToolInputTokens + messageInputTokens,
  }
}

function estimateToolChildren(
  tools: Record<string, unknown>,
  category: ContextCategory,
  estimateString: (text: string) => number,
  calibration: number,
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
        tokens: Math.round(estimateString(payload) * calibration),
      }
    })
    .toSorted((a, b) => b.tokens - a.tokens)
}

function sumTokens(children: ContextCategoryUsage[]): number {
  return children.reduce((sum, child) => sum + child.tokens, 0)
}
