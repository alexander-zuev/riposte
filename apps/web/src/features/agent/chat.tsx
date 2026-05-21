import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import {
  type AgentTransportState,
  type DisputeAgentConnection,
  type DisputeAgentContextState,
  useDisputeAgentChat,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { McpSourcesPopover } from '@web/features/agent/mcp-sources-popover'
import { AgentMessagePart, keyedAgentMessageParts } from '@web/features/agent/message-part'
import { cn } from '@web/lib/utils'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@web/ui/components/ai-elements/conversation'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from '@web/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@web/ui/components/ai-elements/prompt-input'
import { Spinner } from '@web/ui/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@web/ui/components/ui/tooltip'
import type { MCPServersState } from 'agents'
import type { UIMessage } from 'ai'
import { memo, useCallback } from 'react'

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
  const isInputDisabled = transportState !== 'connected'
  const agentState = agent.state
  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      if (isInputDisabled) return
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
  const showActions = !chat.isStreaming

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
        {agentState ? <ContextUsageMeter className="ml-auto" context={agentState.context} /> : null}
      </div>
      <PromptInput className="w-full rounded-none border-0 border-t" onSubmit={handleSubmit}>
        <PromptInputTextarea
          className="text-sm md:text-sm"
          disabled={isInputDisabled}
          placeholder="Type your message here..."
        />
        <PromptInputFooter className="text-sm">
          <PromptInputTools>
            <McpSourcesPopover mcp={mcp} productId={productId} />
          </PromptInputTools>
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

function ContextUsageMeter({
  className,
  context,
}: {
  className?: string
  context: DisputeAgentContextState
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={`Context: ${formatTokenCount(context.usage.totalTokens)} of ${formatTokenCount(context.windowTokens)} used`}
            className={cn(
              'shrink-0 cursor-help text-xs tabular-nums',
              getContextUsageClassName(context),
              className,
            )}
          />
        }
      >
        Context: {formatTokenCount(context.usage.totalTokens)} /{' '}
        {formatTokenCount(context.windowTokens)}
      </TooltipTrigger>
      <TooltipContent>
        Older messages are summarized automatically at {formatTokenCount(context.compactAtTokens)}
      </TooltipContent>
    </Tooltip>
  )
}

const RegenerateMessageAction = memo(function RegenerateMessageAction({
  messageId,
  onRegenerate,
}: {
  messageId: string
  onRegenerate: (id: string) => void
}) {
  const handleClick = useCallback(() => onRegenerate(messageId), [messageId, onRegenerate])
  return (
    <MessageActions className="-ms-1.5">
      <MessageAction tooltip="Regenerate" onClick={handleClick}>
        <ArrowsClockwiseIcon size={16} />
      </MessageAction>
    </MessageActions>
  )
})

function getContextUsageClassName(context: DisputeAgentContextState): string {
  if (context.status === 'compact_required') return 'text-destructive-muted-foreground'
  const warningAtTokens = context.compactAtTokens - context.windowTokens * 0.2
  if (context.usage.totalTokens >= warningAtTokens) return 'text-warning-muted-foreground'
  return 'text-muted-foreground'
}

function formatTokenCount(value: number): string {
  if (value < 1000) return value.toLocaleString()
  return `${Math.round(value / 1000).toLocaleString()}k`
}
