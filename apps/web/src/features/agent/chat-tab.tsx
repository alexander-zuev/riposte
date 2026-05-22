import { useQuery } from '@tanstack/react-query'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { Chat } from '@web/features/agent/chat'
import type {
  AgentTransportState,
  DisputeAgentConnection,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Button } from '@web/ui/components/ui/button'
import { Spinner } from '@web/ui/components/ui/spinner'
import type { MCPServersState } from 'agents'

type ChatTabProps = {
  productId: string
  agent: DisputeAgentConnection
  transportState: AgentTransportState
  mcp: MCPServersState | null
}

/**
 * Chat tab orchestrator. Reads the per-product chat history via the messages
 * Query, then mounts `<Chat>` once the seed is available. WS-driven updates
 * happen inside `<Chat>`; this layer owns initial-load loading and error
 * states. Renders inside the parent card — no card wrapper here.
 */
export function ChatTab({ productId, agent, transportState, mcp }: ChatTabProps) {
  const { data, isPending, isError, error, refetch } = useQuery(chatQueries.messages(productId))

  if (isPending) return <ChatLoading />
  if (isError) return <ChatError error={error} onRetry={async () => refetch()} />
  return (
    <Chat
      key={data.map((message) => message.id).join(':')}
      agent={agent}
      transportState={transportState}
      initialMessages={data}
      productId={productId}
      mcp={mcp}
    />
  )
}

function ChatLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <Spinner />
    </div>
  )
}

type ChatErrorProps = {
  error: Error
  onRetry: () => void
}

function ChatError({ error, onRetry }: ChatErrorProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>Could not load chat history</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}
