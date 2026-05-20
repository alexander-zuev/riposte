import { useQuery } from '@tanstack/react-query'
import { chatQueries } from '@web/entities/chat/chat-queries'
import { Chat } from '@web/features/agent/chat'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Button } from '@web/ui/components/ui/button'
import { Card, CardContent } from '@web/ui/components/ui/card'
import { Spinner } from '@web/ui/components/ui/spinner'

type ChatTabProps = {
  productId: string
}

/**
 * Chat tab orchestrator. Reads the per-product chat history via the messages
 * Query, then mounts `<Chat>` once the seed is available. WS-driven updates
 * happen inside `<Chat>`; this layer only owns the initial-load loading and
 * error states (replaces the previous Suspense boundary).
 */
export function ChatTab({ productId }: ChatTabProps) {
  const { data, isPending, isError, error, refetch } = useQuery(
    chatQueries.messages(productId),
  )

  if (isPending) return <ChatLoading />
  if (isError) return <ChatError error={error} onRetry={() => refetch()} />
  return <Chat productId={productId} initialMessages={data} />
}

function ChatLoading() {
  return (
    <Card className="h-[calc(100vh-22rem)] gap-0 py-0">
      <CardContent className="flex flex-1 items-center justify-center p-0 text-muted-foreground">
        <Spinner />
      </CardContent>
    </Card>
  )
}

type ChatErrorProps = {
  error: Error
  onRetry: () => void
}

function ChatError({ error, onRetry }: ChatErrorProps) {
  return (
    <Card className="h-[calc(100vh-22rem)] gap-0 py-0">
      <CardContent className="flex flex-1 items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Could not load chat history</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      </CardContent>
    </Card>
  )
}
