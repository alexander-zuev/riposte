import { PencilSimpleIcon, XIcon } from '@phosphor-icons/react'
import { createLogger, type DisputeAgentMessage } from '@riposte/core/client'
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
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Button } from '@web/ui/components/ui/button'
import { GridLoader } from '@web/ui/components/ui/grid-loader'
import { Textarea } from '@web/ui/components/ui/textarea'
import type { MCPServersState } from 'agents'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const logger = createLogger('chat')

type ChatProps = {
  agent: DisputeAgentConnection
  initialMessages: DisputeAgentMessage[]
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
  const assistant = useDisputeAgentChat(agent, initialMessages, productId)
  const animateEntrance = useRef(
    initialMessages.length === 1 && initialMessages[0]?.role === 'assistant',
  )
  useEffect(() => {
    animateEntrance.current = false
  }, [])
  const { cancelCompaction } = useCancelAgentCompaction({ productId })
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [interruptedMessageId, setInterruptedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const isPromptInputDisabled = !assistant.isAvailable || assistant.status === 'submitted'
  const isEditDisabled = isPromptInputDisabled || assistant.status === 'streaming'

  const handleSubmit = useCallback(
    (message: { text?: string }) => {
      if (!assistant.isAvailable) return false
      const text = message.text?.trim()
      if (!text) return false
      assistant.sendMessage({ text, metadata: { createdAt: new Date().toISOString() } })
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
  const handleStartEdit = useCallback((message: DisputeAgentMessage) => {
    setEditingMessageId(message.id)
    setEditingText(getMessageText(message))
  }, [])
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingText('')
  }, [])
  const handleSendEdit = useCallback(() => {
    if (!editingMessageId || isEditDisabled) return
    const text = editingText.trim()
    if (!text) return

    // Pass `messageId` so the SDK truncates state to `[0…i]`, replaces the edited
    // message in place keeping its id, and resubmits. Because every id stays known
    // to the server, the DO's `cf_agent_use_chat_request` prune (`_deleteStaleRows`)
    // engages and drops the later turns. Resending with a fresh id trips that guard
    // and leaves stale messages in the DO that the model keeps seeing.
    assistant.sendMessage({
      text,
      messageId: editingMessageId,
      metadata: { createdAt: new Date().toISOString() },
    })
    setEditingMessageId(null)
    setEditingText('')
    setErrorDismissed(false)
    setInterruptedMessageId(null)
  }, [assistant, editingMessageId, editingText, isEditDisabled])
  const showActions = !assistant.isStreaming
  const showErrorBanner = assistant.error !== undefined && !errorDismissed

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {assistant.messages.map((message, index) => {
            const timestamp = formatMessageTime(message.metadata?.createdAt)
            const isEditing = editingMessageId === message.id && message.role === 'user'
            // The message being generated is always the last one; hide its footer
            // (actions + timestamp) until the stream finishes.
            const isStreamingMessage =
              message.role === 'assistant' &&
              assistant.isStreaming &&
              index === assistant.messages.length - 1

            return (
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
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: 0.5, ease: 'easeOut' }}
                      >
                        <RegenerateMessageAction
                          messageId={message.id}
                          onRegenerate={handleRegenerate}
                        />
                        {timestamp && <MessageTimestamp timestamp={timestamp} />}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <MessageContent className="w-full max-w-2xl gap-3">
                        <Textarea
                          className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm md:text-sm"
                          value={editingText}
                          autoFocus
                          onChange={(event) => setEditingText(event.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!editingText.trim() || isEditDisabled}
                            onClick={handleSendEdit}
                          >
                            Send
                          </Button>
                        </div>
                      </MessageContent>
                    ) : (
                      <MessageContent>
                        <MessageParts parts={message.parts} isStreaming={assistant.isStreaming} />
                      </MessageContent>
                    )}
                    {!(message.role === 'user' && isEditing) && !isStreamingMessage && (
                      <MessageFooter from={message.role}>
                        {message.role === 'assistant' && (
                          <>
                            <RegenerateMessageAction
                              messageId={message.id}
                              onRegenerate={handleRegenerate}
                              disabled={isEditDisabled}
                            />
                            {interruptedMessageId === message.id && (
                              <span className="text-xs text-muted-foreground italic">
                                Interrupted
                              </span>
                            )}
                          </>
                        )}
                        {message.role === 'user' && (
                          <MessageActions>
                            <MessageAction
                              tooltip="Edit message"
                              disabled={isEditDisabled}
                              onClick={() => handleStartEdit(message)}
                            >
                              <PencilSimpleIcon size={16} />
                            </MessageAction>
                          </MessageActions>
                        )}
                        {message.role === 'assistant' && timestamp && (
                          <MessageTimestamp timestamp={timestamp} />
                        )}
                      </MessageFooter>
                    )}
                  </>
                )}
              </Message>
            )
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex min-h-8 items-center gap-2 px-4 py-2 text-muted-foreground">
        <div className="flex size-4 shrink-0 items-center justify-center">
          {(assistant.status === 'submitted' || assistant.status === 'streaming') && <GridLoader />}
        </div>
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
          disabled={isPromptInputDisabled}
          placeholder="Type your message here..."
        />
        <PromptInputFooter className="text-sm">
          <PromptInputTools>
            <McpSourcesPopover mcp={mcp} productId={productId} />
          </PromptInputTools>
          <PromptInputSubmit className="text-sm" disabled={isPromptInputDisabled} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

function getMessageText(message: DisputeAgentMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n')
}

function formatMessageTime(value: string | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

function MessageFooter({
  children,
  from,
}: {
  children: ReactNode
  from: DisputeAgentMessage['role']
}) {
  return (
    <div
      className={
        from === 'user'
          ? 'ml-auto flex items-center justify-end gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'
          : 'flex items-center gap-2 text-xs text-muted-foreground'
      }
    >
      {children}
    </div>
  )
}

function MessageTimestamp({ timestamp }: { timestamp: string }) {
  return (
    <>
      <span aria-hidden="true" className="hidden [&:not(:first-child)]:inline">
        ·
      </span>
      <time className="whitespace-nowrap">{timestamp}</time>
    </>
  )
}
