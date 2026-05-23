import { useAgentChat } from '@cloudflare/ai-chat/react'
import { createLogger } from '@riposte/core/client'
import { useProductSetupInvalidation } from '@web/features/agent/hooks/use-product-setup-invalidation'
import type { MCPServersState } from 'agents'
import { useAgent } from 'agents/react'
import type { ChatStatus, UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'

const logger = createLogger('dispute-agent-chat')

export type AgentTransportState = 'connecting' | 'connected' | 'closing' | 'disconnected'

export type DisputeAgentUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  updatedAt: string | null
}

export type DisputeAgentContextStatus = 'ok' | 'compact_required'

export type DisputeAgentCompactionState =
  | { status: 'idle' }
  | { status: 'compacting'; startedAt: string }
  | { status: 'failed'; failedAt: string; message: string }

export type ContextCategory = 'system_prompt' | 'system_tools' | 'mcp_tools' | 'messages'

export type ContextCategoryUsage = {
  label: string
  category: ContextCategory
  tokens: number
  children?: ContextCategoryUsage[]
}

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

type DisputeAgentState = {
  mode: 'setup' | 'operate'
  setupChangeId: string | null
  context: DisputeAgentContextState
}

/**
 * Live MCP servers state pushed from the DO over the WebSocket. `null` until
 * the first `CF_AGENT_MCP_SERVERS` broadcast arrives (the SDK replays current
 * state on connect, so this resolves once the WS is identified).
 */
export function useDisputeAgent(productId: string) {
  const [mcp, setMcp] = useState<MCPServersState | null>(null)
  const invalidateProductSetup = useProductSetupInvalidation(productId)
  const agent = useAgent<DisputeAgentState>({
    agent: 'dispute-agent',
    name: productId,
    prefix: 'api/agents',
    onStateUpdate: (state, source) => {
      // Log scalars only — full state (incl. estimatedUsage.byCategory tree)
      // is on `agent.state` for whoever needs it. Logging the whole payload
      // dumps ~100 lines per WS frame.
      logger.debug('state_update', {
        source,
        mode: state.mode,
        setupChangeId: state.setupChangeId,
        status: state.context.status,
        compactionStatus: state.context.compaction.status,
        usageTotalTokens: state.context.usage.totalTokens,
        estimatedInputTokens: state.context.estimatedUsage.total,
      })
      invalidateProductSetup(state, source)
    },
    onMcpUpdate: (next) => {
      logger.debug('mcp_update', {
        servers: Object.keys(next.servers).length,
        tools: next.tools.length,
      })
      setMcp(next)
    },
  })
  return {
    agent,
    mcp,
    transportState: getAgentTransportState(agent.readyState, agent.identified),
  }
}

export type DisputeAgentConnection = ReturnType<typeof useDisputeAgent>['agent']

export function getAgentTransportState(
  readyState: number,
  identified: boolean,
): AgentTransportState {
  switch (readyState) {
    case WebSocket.CONNECTING:
      return 'connecting'
    case WebSocket.OPEN:
      return identified ? 'connected' : 'connecting'
    case WebSocket.CLOSING:
      return 'closing'
    case WebSocket.CLOSED:
    default:
      return 'disconnected'
  }
}

// Reuse the AI SDK's ChatStatus directly so we stay aligned if the SDK ever
// adds or renames a state. Same four values today.
export type AssistantStatus = ChatStatus

/**
 * Curated view of the SDK's `useAgentChat` for our consumers. Hides one
 * SDK quirk — that `isStreaming` and `status === 'streaming'` diverge for
 * server-initiated streams (saveMessages, another tab) — by overlaying
 * `isStreaming` into the reported `status`. Everything else passes through.
 *
 * `getInitialMessages: null` disables the SDK's HTTP `/get-messages` prefetch
 * + `React.use()` suspension. We pre-fetch via a server fn → DO RPC so the
 * call carries the browser's auth cookie under SSR, and we render explicit
 * loading/error UI instead of bubbling Suspense to the route boundary.
 */
export function useDisputeAgentChat(
  agent: DisputeAgentConnection,
  initialMessages: UIMessage<never>[],
) {
  const snapshotRef = useRef({
    messageCount: initialMessages.length,
    lastMessageId: initialMessages.at(-1)?.id ?? null,
    lastMessageRole: initialMessages.at(-1)?.role ?? null,
    status: 'initializing',
    isStreaming: false,
  })
  const chat = useAgentChat({
    agent,
    getInitialMessages: null,
    messages: initialMessages,
    onError: (error) => {
      logger.error('chat_error', { error, snapshot: snapshotRef.current })
    },
  })

  useEffect(() => {
    const next = {
      messageCount: chat.messages.length,
      lastMessageId: chat.messages.at(-1)?.id ?? null,
      lastMessageRole: chat.messages.at(-1)?.role ?? null,
      status: chat.status,
      isStreaming: chat.isStreaming,
    }
    const prev = snapshotRef.current
    const changed =
      prev.messageCount !== next.messageCount ||
      prev.lastMessageId !== next.lastMessageId ||
      prev.lastMessageRole !== next.lastMessageRole ||
      prev.status !== next.status ||
      prev.isStreaming !== next.isStreaming

    if (changed) {
      logger.debug('chat_state', next)
      snapshotRef.current = next
    }
  }, [chat.isStreaming, chat.messages, chat.status])

  return {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    stop: chat.stop,
    regenerate: chat.regenerate,
    isStreaming: chat.isStreaming,
    // `isStreaming` covers server-initiated streams too; overlay it onto
    // status so consumers don't have to think about the divergence.
    // `as const` pins the literal so TS doesn't widen the ternary to `string`.
    status: chat.isStreaming ? ('streaming' as const) : chat.status,
    error: chat.error,
    // True when the WS is open AND the agent has identified (per the same
    // semantics as `getAgentTransportState(... ) === 'connected'`). The page
    // header still uses `getAgentTransportState` for the visual indicator;
    // chat-input gating reads this directly.
    isAvailable: agent.readyState === WebSocket.OPEN && agent.identified,
  }
}

export type DisputeAssistant = ReturnType<typeof useDisputeAgentChat>
