import { createLogger } from '@riposte/core'
import {
  DISPUTE_AGENT_SESSION_ID,
  type DisputeAgentCompactionOverlay,
} from '@server/infrastructure/agents/dispute-agent.compaction.storage'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import {
  COMPACTION_PREFIX,
  createCompactFunction,
  estimateMessageTokens,
} from 'agents/experimental/memory/utils'
import { generateText, type LanguageModel, type UIMessage } from 'ai'

const logger = createLogger('dispute-agent-compaction')

const TEST_PROTECT_HEAD = 1
const TEST_TAIL_TOKEN_BUDGET = 2_000
const TEST_MIN_TAIL_MESSAGES = 1

type CompactDisputeAgentMessagesArgs = {
  messages: UIMessage[]
  overlays: DisputeAgentCompactionOverlay[]
  model: LanguageModel
  saveOverlay: (args: {
    sessionId: string
    summary: string
    fromMessageId: string
    toMessageId: string
  }) => DisputeAgentCompactionOverlay
  /**
   * Optional abort signal. When fired, the summarizer's `generateText` call
   * aborts, withRetry surfaces the AbortError (not treated as retryable), and
   * the compaction resolves to `Result.err`.
   */
  abortSignal?: AbortSignal
}

type CompactDisputeAgentMessagesResult =
  | { ok: true; overlay: DisputeAgentCompactionOverlay; messages: UIMessage[] }
  | { ok: false; error: Error }

export async function compactDisputeAgentMessages(
  args: CompactDisputeAgentMessagesArgs,
): Promise<CompactDisputeAgentMessagesResult> {
  const messages = applyDisputeAgentCompactions(args.messages, args.overlays)
  logger.debug('dispute_agent_compaction_start', {
    rawMessageCount: args.messages.length,
    modelMessageCount: messages.length,
    overlayCount: args.overlays.length,
    modelTokenEstimate: estimateTokens(messages),
  })
  const compact = createCompactFunction({
    summarize: async (prompt) =>
      withRetry(async () =>
        generateText({ model: args.model, prompt, abortSignal: args.abortSignal }).then(
          (result) => result.text,
        ),
      ),
    // TODO(context): restore to protectHead=3, tailTokenBudget=20_000, minTailMessages=2 after local compaction testing.
    protectHead: TEST_PROTECT_HEAD,
    tailTokenBudget: TEST_TAIL_TOKEN_BUDGET,
    minTailMessages: TEST_MIN_TAIL_MESSAGES,
  })

  try {
    const compacted = await compact(messages)
    if (!compacted) {
      // No-op signal — the SDK's createCompactFunction decided the tail
      // budget already swallows everything. Worth knowing because the
      // trigger will keep firing turn after turn (static-dominates case).
      logger.warn('dispute_agent_compaction_no_overlay', {
        modelMessageCount: messages.length,
        modelTokenEstimate: estimateTokens(messages),
        tailTokenBudget: TEST_TAIL_TOKEN_BUDGET,
        minTailMessages: TEST_MIN_TAIL_MESSAGES,
      })
      return { ok: false, error: new Error('Compaction produced no overlay') }
    }

    if (!new Set(messages.map((message) => message.id)).has(compacted.toMessageId)) {
      return { ok: false, error: new Error('Compaction ended at an unknown message') }
    }

    const firstOverlay = args.overlays[0]
    const fromMessageId = firstOverlay ? firstOverlay.fromMessageId : compacted.fromMessageId
    logger.debug('dispute_agent_compaction_overlay_ready', {
      fromMessageId,
      toMessageId: compacted.toMessageId,
      summaryTokenEstimate: estimateMessageTokens([
        {
          id: `${COMPACTION_PREFIX}pending`,
          role: 'assistant',
          parts: [{ type: 'text', text: compacted.summary }],
        },
      ]),
    })
    const overlay = args.saveOverlay({
      sessionId: DISPUTE_AGENT_SESSION_ID,
      summary: compacted.summary,
      fromMessageId,
      toMessageId: compacted.toMessageId,
    })

    return {
      ok: true,
      overlay,
      messages: applyDisputeAgentCompactions(args.messages, [...args.overlays, overlay]),
    }
  } catch (error) {
    logger.warn('dispute_agent_compaction_failed', { error })
    return { ok: false, error: toError(error) }
  }
}

function estimateTokens(messages: UIMessage[]): number {
  return estimateMessageTokens(messages)
}

export function applyDisputeAgentCompactions(
  messages: UIMessage[],
  overlays: DisputeAgentCompactionOverlay[],
): UIMessage[] {
  if (overlays.length === 0) return messages

  const ids = messages.map((message) => message.id)
  const result: UIMessage[] = []
  let index = 0

  while (index < messages.length) {
    const matching = overlays.filter((overlay) => overlay.fromMessageId === ids[index])
    const overlay = matching.length > 1 ? matching[matching.length - 1] : matching[0]

    if (overlay) {
      const endIndex = ids.indexOf(overlay.toMessageId)
      if (endIndex >= index) {
        result.push({
          id: `${COMPACTION_PREFIX}${overlay.id}`,
          role: 'assistant',
          parts: [{ type: 'text', text: overlay.summary }],
        })
        index = endIndex + 1
        continue
      }
    }

    const message = messages[index]
    if (!message) break
    result.push(message)
    index += 1
  }

  return result
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  const { times, delayMs, backoff, shouldRetry } = RETRY.externalApi.retry
  let attempt = 0
  let nextDelayMs = delayMs

  while (true) {
    try {
      return await operation()
    } catch (error) {
      attempt += 1
      const retryable = shouldRetry?.(error) === true || isTransientError(error)
      if (attempt > times || !retryable) throw error
      await sleep(nextDelayMs)
      if (backoff === 'exponential') nextDelayMs *= 2
      if (backoff === 'linear') nextDelayMs += delayMs
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(String(error))
}
