import { ContextUsageMeter } from '@web/features/agent/context-usage-meter'
import { useCancelAgentCompaction } from '@web/features/agent/hooks/use-cancel-agent-compaction'
import {
  type AgentTransportState,
  type DisputeAgentConnection,
  useDisputeAgentChat,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { McpSourcesPopover } from '@web/features/agent/mcp-sources-popover'
import { AgentMessagePart, keyedAgentMessageParts } from '@web/features/agent/message-part'
import { RegenerateMessageAction } from '@web/features/agent/regenerate-message-action'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@web/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@web/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@web/ui/components/ai-elements/prompt-input'
import { Spinner } from '@web/ui/components/ui/spinner'
import type { MCPServersState } from 'agents'
import type { UIMessage } from 'ai'
import { useCallback } from 'react'

type ChatProps = {
  agent: DisputeAgentConnection
  transportState: AgentTransportState
  initialMessages: UIMessage<never>[]
  productId: string
  mcp: MCPServersState | null
}

/**
 * Agent chat surface. Streams from the per-product DisputeAgent DO via
 * `useDisputeAgentChat`. The WS connection (`agent`) and transport state are
 * owned by the parent page so the connection indicator in the card header
 * tracks the same instance.
 */
export function Chat({ agent, transportState, initialMessages, productId, mcp }: ChatProps) {
  const chat = useDisputeAgentChat(agent, initialMessages)
  const { cancelCompaction } = useCancelAgentCompaction({ productId })
  const isInputDisabled = transportState !== 'connected'
  const agentState = agent.state
  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      if (isInputDisabled) return
      // Both Enter and the submit button funnel through here. The button has
      // its own stop-vs-submit branch on click (handled in PromptInputSubmit),
      // but Enter would otherwise bypass it. Single gate: never send while the
      // agent is mid-stream. User must explicitly click stop, then submit.
      if (chat.isStreaming) return
      const text = message.text?.trim()
      if (!text) return
      chat.sendMessage({ text })
    },
    [chat, isInputDisabled],
  )
  const handleRegenerate = useCallback(
    (messageId: string) => {
      void chat.regenerate({ messageId })
    },
    [chat],
  )
  const handleCancelCompaction = useCallback(() => {
    cancelCompaction()
  }, [cancelCompaction])
  const showActions = !chat.isStreaming
  const promptStatus = chat.isStreaming ? 'streaming' : chat.status

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {chat.messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {keyedAgentMessageParts(message.parts).map(({ key, part }) => (
                  <AgentMessagePart key={key} isStreaming={chat.isStreaming} part={part} />
                ))}
              </MessageContent>
              {showActions && message.role === 'assistant' && (
                <RegenerateMessageAction messageId={message.id} onRegenerate={handleRegenerate} />
              )}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex min-h-8 items-center gap-2 px-4 py-2 text-muted-foreground">
        {chat.isStreaming && <Spinner className="size-4" />}
        {agentState ? (
          <ContextUsageMeter
            className="ml-auto"
            context={agentState.context}
            onCancelCompaction={handleCancelCompaction}
          />
        ) : null}
      </div>
      <PromptInput className="w-full rounded-none border-0 border-t" onSubmit={handleSubmit}>
        <PromptInputTextarea
          className="text-sm md:text-sm"
          placeholder="Type your message here..."
        />
        <PromptInputFooter className="text-sm">
          <PromptInputTools>
            <McpSourcesPopover mcp={mcp} productId={productId} />
          </PromptInputTools>
          <PromptInputSubmit
            className="text-sm"
            disabled={isInputDisabled}
            status={promptStatus}
            onStop={chat.stop}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
