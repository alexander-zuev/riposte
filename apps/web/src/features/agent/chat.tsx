import { XIcon } from '@phosphor-icons/react'
import { createLogger } from '@riposte/core/client'
import { ContextUsageMeter } from '@web/features/agent/context-usage-meter'
import { useCancelAgentCompaction } from '@web/features/agent/hooks/use-cancel-agent-compaction'
import {
  type DisputeAgentConnection,
  useDisputeAgentChat,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { McpSourcesPopover } from '@web/features/agent/mcp-sources-popover'
import { MessageParts } from '@web/features/agent/message-part'
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
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Button } from '@web/ui/components/ui/button'
import { Spinner } from '@web/ui/components/ui/spinner'
import type { MCPServersState } from 'agents'
import type { UIMessage } from 'ai'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

const logger = createLogger('chat')

type ChatProps = {
  agent: DisputeAgentConnection
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
export function Chat({ agent, initialMessages, productId, mcp }: ChatProps) {
  const assistant = useDisputeAgentChat(agent, initialMessages)
  const animateEntrance = useRef(
    initialMessages.length === 1 && initialMessages[0]?.role === 'assistant',
  )
  useEffect(() => {
    animateEntrance.current = false
  }, [])
  const { cancelCompaction } = useCancelAgentCompaction({ productId })
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [interruptedMessageId, setInterruptedMessageId] = useState<string | null>(null)

  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      if (!assistant.isAvailable) return false
      const text = message.text?.trim()
      if (!text) return false
      assistant.sendMessage({ text })
      setErrorDismissed(false)
      setInterruptedMessageId(null)
      return true
    },
    [assistant],
  )
  const handleStop = useCallback(async () => {
    const lastAssistant = assistant.messages.findLast((m) => m.role === 'assistant')
    await assistant.stop()
    if (lastAssistant) setInterruptedMessageId(lastAssistant.id)
  }, [assistant])
  const handleRegenerate = useCallback(
    (messageId: string) => {
      setInterruptedMessageId(null)
      assistant.regenerate({ messageId }).catch((error) => {
        logger.warn('regenerate_failed', { error, messageId })
      })
    },
    [assistant],
  )
  const handleCancelCompaction = useCallback(() => {
    cancelCompaction()
  }, [cancelCompaction])
  const showActions = !assistant.isStreaming
  const showErrorBanner = assistant.error !== undefined && !errorDismissed

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {assistant.messages.map((message) => (
            <Message key={message.id} from={message.role}>
              {animateEntrance.current ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    <MessageContent>
                      <MessageParts parts={message.parts} isStreaming={assistant.isStreaming} />
                    </MessageContent>
                  </motion.div>
                  {showActions && message.role === 'assistant' && (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.5, ease: 'easeOut' }}
                    >
                      <RegenerateMessageAction
                        messageId={message.id}
                        onRegenerate={handleRegenerate}
                      />
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <MessageContent>
                    <MessageParts parts={message.parts} isStreaming={assistant.isStreaming} />
                  </MessageContent>
                  {showActions && message.role === 'assistant' && (
                    <div className="flex items-center gap-2">
                      <RegenerateMessageAction
                        messageId={message.id}
                        onRegenerate={handleRegenerate}
                      />
                      {interruptedMessageId === message.id && (
                        <span className="text-xs text-muted-foreground italic">Interrupted</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex min-h-8 items-center gap-2 px-4 py-2 text-muted-foreground">
        {assistant.isStreaming && <Spinner className="size-4" />}
        {agent.state ? (
          <ContextUsageMeter
            className="ml-auto"
            context={agent.state.context}
            onCancelCompaction={handleCancelCompaction}
          />
        ) : null}
      </div>
      {showErrorBanner &&
        assistant.error && (
          // Full error.message is logged via the hook's onError ('chat_error').
          // The user sees a short, scannable summary — they don't need to read
          // raw stacks / Zod dumps.
          <div className="px-4 pb-2">
            <Alert variant="destructive">
              <AlertTitle>The agent hit an error</AlertTitle>
              <AlertDescription>Try again, or refresh if it keeps happening.</AlertDescription>
              <AlertAction>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Dismiss error"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setErrorDismissed(true)}
                >
                  <XIcon />
                </Button>
              </AlertAction>
            </Alert>
          </div>
        )}
      <PromptInput
        className="w-full rounded-none border-0 border-t"
        onSubmit={handleSubmit}
        onStop={handleStop}
        status={assistant.status}
      >
        <PromptInputTextarea
          className="text-sm md:text-sm"
          placeholder="Type your message here..."
        />
        <PromptInputFooter className="text-sm">
          <PromptInputTools>
            <McpSourcesPopover mcp={mcp} productId={productId} />
          </PromptInputTools>
          <PromptInputSubmit className="text-sm" disabled={!assistant.isAvailable} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
