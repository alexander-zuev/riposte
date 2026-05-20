import { useAgentChat } from '@cloudflare/ai-chat/react'
import { createLogger } from '@riposte/core/client'
import { useAgent } from 'agents/react'

const logger = createLogger('dispute-agent-chat')

/**
 * Single hook for the per-product DisputeAgent chat. Opens a WebSocket to the
 * DO instance keyed by `productId` and returns the AI SDK chat bindings.
 *
 * `getInitialMessages: null` opts out of the HTTP /get-messages prefetch the
 * SDK normally runs via React's `use()` at render time. During SSR that
 * fetch is Worker-internal and the browser's auth cookie isn't forwarded,
 * so `requireAuth` returns 401 and React bails the subtree to client
 * rendering. Messages load over the WebSocket on connect instead — the
 * welcome message is already primed via `primeOnboarding`.
 *
 * `onError` surfaces runtime stream/transport failures into the browser
 * console. SSR-time suspense throws (thrown from inside `use()`) are NOT
 * caught here — they only appear in the vite dev terminal / `wrangler tail`.
 */
export function useDisputeAgentChat(productId: string) {
  const agent = useAgent({
    agent: 'dispute-agent',
    name: productId,
    prefix: 'api/agents',
  })
  return useAgentChat({
    agent,
    // getInitialMessages: null,
    onError: (error) => {
      logger.error('chat_error', { error })
    },
  })
}
