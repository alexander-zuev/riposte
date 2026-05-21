import {
  type AgentTransportState,
  useDisputeAgent,
  useDisputeAgentChat,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { AgentMessagePart, agentMessagePartKey } from '@web/features/agent/message-part'
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
import type { UIMessage } from 'ai'
import { useCallback } from 'react'

type ChatProps = {
  agent: ReturnType<typeof useDisputeAgent>
  transportState: AgentTransportState
  initialMessages: UIMessage<never>[]
}

/**
 * Agent chat surface. Streams from the per-product DisputeAgent DO via
 * `useDisputeAgentChat`. The WS connection (`agent`) and transport state are
 * owned by the parent page so the connection indicator in the card header
 * tracks the same instance.
 */
export function Chat({ agent, transportState, initialMessages }: ChatProps) {
  const chat = useDisputeAgentChat(agent, initialMessages)
  const isInputDisabled = transportState !== 'connected'
  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      if (isInputDisabled) return
      const text = message.text?.trim()
      if (!text) return
      void chat.sendMessage({ text })
    },
    [chat, isInputDisabled],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {chat.messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part) => (
                  <AgentMessagePart key={agentMessagePartKey(part)} part={part} />
                ))}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {chat.isStreaming && (
        <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground">
          <Spinner className="size-4" />
        </div>
      )}
      <PromptInput className="w-full rounded-none border-0 border-t" onSubmit={handleSubmit}>
        <PromptInputTextarea
          className="text-sm md:text-sm"
          disabled={isInputDisabled}
          placeholder={
            transportState === 'connecting'
              ? 'Connecting…'
              : transportState === 'closing'
                ? 'Closing…'
                : transportState === 'disconnected'
                  ? 'Disconnected'
                  : 'Message'
          }
        />
        <PromptInputFooter className="text-sm">
          <PromptInputTools />
          <PromptInputSubmit
            className="text-sm"
            disabled={isInputDisabled}
            status={chat.status}
            onStop={chat.stop}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
