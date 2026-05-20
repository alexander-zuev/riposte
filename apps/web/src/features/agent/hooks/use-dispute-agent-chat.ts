import { useAgentChat } from '@cloudflare/ai-chat/react'
import { createLogger } from '@riposte/core/client'
import type { UIMessage } from 'ai'
import { useAgent } from 'agents/react'

const logger = createLogger('dispute-agent-chat')

export type AgentTransportState = 'connecting' | 'connected' | 'closing' | 'disconnected'

export function useDisputeAgent(productId: string) {
  return useAgent({
    agent: 'dispute-agent',
    name: productId,
    prefix: 'api/agents',
    onStateUpdate: (state, source) => {
      logger.debug('state_update', { state, source })
    },
  })
}

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

/**
 * Single hook for the per-product DisputeAgent chat. Opens a WebSocket to the
 * DO instance keyed by `productId` and seeds the chat with messages already
 * fetched via the `chatQueries.messages` TanStack Query (see `chat-tab.tsx`).
 *
 * `getInitialMessages: null` disables the SDK's HTTP `/get-messages` prefetch
 * + `React.use()` suspension. We pre-fetch via a server fn → DO RPC so the
 * call carries the browser's auth cookie under SSR, and we render explicit
 * loading/error UI instead of bubbling Suspense to the route boundary.
 *
 * `onError` surfaces runtime chat stream failures to the browser console.
 */
export function useDisputeAgentChat(
  agent: ReturnType<typeof useDisputeAgent>,
  initialMessages: UIMessage<never>[],
) {
  return useAgentChat({
    agent,
    getInitialMessages: null,
    messages: initialMessages,
    onError: (error) => {
      logger.error('chat_error', { error })
    },
  })
}
