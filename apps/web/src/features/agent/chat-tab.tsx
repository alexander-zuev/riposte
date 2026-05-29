import { createLogger } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { Chat } from '@web/features/agent/chat'
import type { DisputeAgentConnection } from '@web/features/agent/hooks/use-dispute-agent-chat'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Button } from '@web/ui/components/ui/button'
import { GridLoader } from '@web/ui/components/ui/grid-loader'
import type { MCPServersState } from 'agents'
import { useEffect } from 'react'

const logger = createLogger('chat-tab')

type ChatTabProps = {
  productId: string
  agent: DisputeAgentConnection
  mcp: MCPServersState | null
}

/**
 * Chat tab orchestrator. Reads the per-product chat history via the messages
 * Query, then mounts `<Chat>` once the seed is available. WS-driven updates
 * happen inside `<Chat>`; this layer owns initial-load loading and error
 * states. Renders inside the parent card — no card wrapper here.
 */
export function ChatTab({ productId, agent, mcp }: ChatTabProps) {
  const { data, isPending, isError, error, refetch } = useQuery(chatQueries.messages(productId))

  if (isPending) return <ChatLoading />
  if (isError) {
    return <ChatError error={error} productId={productId} onRetry={async () => refetch()} />
  }
  return (
    <Chat
      key={data.map((message) => message.id).join(':')}
      agent={agent}
      initialMessages={data}
      productId={productId}
      mcp={mcp}
    />
  )
}

function ChatLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <GridLoader />
    </div>
  )
}

type ChatErrorProps = {
  error: Error
  productId: string
  onRetry: () => void
}

function ChatError({ error, productId, onRetry }: ChatErrorProps) {
  useEffect(() => {
    logger.warn('chat_history_load_failed', {
      productId,
      causeName: error.name,
      causeMessage: error.message,
    })
  }, [error, productId])

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>Could not load chat history</AlertTitle>
        <AlertDescription>Refresh the chat or try again in a moment</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}
