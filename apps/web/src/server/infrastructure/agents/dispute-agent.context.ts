export type DisputeAgentContextStatus = 'ok' | 'compact_required'

export type DisputeAgentUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  updatedAt: string | null
}

export type DisputeAgentContextState = {
  windowTokens: number
  compactAtTokens: number
  status: DisputeAgentContextStatus
  usage: DisputeAgentUsage
}

export const DISPUTE_AGENT_CONTEXT_WINDOW = 256_000
export const DISPUTE_AGENT_COMPACT_THRESHOLD = 0.8
export const DISPUTE_AGENT_COMPACT_AT_TOKENS = Math.floor(
  DISPUTE_AGENT_CONTEXT_WINDOW * DISPUTE_AGENT_COMPACT_THRESHOLD,
)

export const INITIAL_USAGE: DisputeAgentUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  updatedAt: null,
}

export function createDisputeAgentContextState(
  usage: DisputeAgentUsage = INITIAL_USAGE,
): DisputeAgentContextState {
  return {
    windowTokens: DISPUTE_AGENT_CONTEXT_WINDOW,
    compactAtTokens: DISPUTE_AGENT_COMPACT_AT_TOKENS,
    status: getDisputeAgentContextStatus({
      totalTokens: usage.totalTokens,
      compactAtTokens: DISPUTE_AGENT_COMPACT_AT_TOKENS,
    }),
    usage,
  }
}

export function getDisputeAgentContextStatus(args: {
  totalTokens: number
  compactAtTokens: number
}): DisputeAgentContextStatus {
  if (args.totalTokens >= args.compactAtTokens) return 'compact_required'
  return 'ok'
}
