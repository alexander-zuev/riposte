import {
  getAgentTransportState,
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
import { Card, CardContent, CardFooter } from '@web/ui/components/ui/card'
import { ConnectionIndicator } from '@web/ui/components/ui/connection-indicator'
import { Spinner } from '@web/ui/components/ui/spinner'
import type { UIMessage } from 'ai'
import { useCallback } from 'react'

type ChatProps = {
  productId: string
  initialMessages: UIMessage<never>[]
}

/**
 * Agent chat surface. Streams from the per-product DisputeAgent DO via
 * `useDisputeAgentChat`. All message content (welcome bubble, step CTAs as
 * markdown links, free-form responses) is emitted by the agent — no UI-side
 * script copy.
 */
export function Chat({ productId, initialMessages }: ChatProps) {
  const agent = useDisputeAgent(productId)
  const transportState = getAgentTransportState(agent.readyState, agent.identified)
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
    <div className="flex flex-col gap-2">
      <div className="flex">
        <ConnectionIndicator state={transportState} />
      </div>
      <Card className="h-[calc(100vh-22rem)] gap-0 py-0 text-sm">
        <CardContent className="flex flex-1 overflow-hidden p-0">
          <Conversation className="flex-1">
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
        </CardContent>
        {chat.isStreaming && (
          <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground">
            <Spinner className="size-4" />
          </div>
        )}
        <CardFooter className="p-0">
          <PromptInput className="w-full border-0" onSubmit={handleSubmit}>
            <PromptInputTextarea
              className="text-sm md:text-sm"
              disabled={isInputDisabled}
              placeholder={
                transportState === 'connecting'
                  ? 'Connecting to the agent'
                  : transportState === 'closing'
                    ? 'Agent connection is closing'
                    : transportState === 'disconnected'
                      ? 'Agent is disconnected'
                      : 'Ask the agent — or click the action above to continue'
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
        </CardFooter>
      </Card>
    </div>
  )
}
