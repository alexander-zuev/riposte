import { Chat } from '@web/features/agent/chat'
import { Card, CardContent } from '@web/ui/components/ui/card'
import { Spinner } from '@web/ui/components/ui/spinner'
import { Suspense } from 'react'

type ChatTabProps = {
  productId: string
}

/**
 * Chat tab content. Always-on agent chat — the agent's system prompt is
 * mode-aware (setup vs operate), so the UI never gates the chat surface.
 *
 * Wraps Chat in Suspense because `useAgent`/`useAgentChat` throw a promise on
 * first mount while the agent client warms up. Without a local boundary, that
 * promise bubbles to the router's pending UI and reloads the whole page.
 * Session-switching UI is post-MVP.
 */
export function ChatTab({ productId }: ChatTabProps) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <Chat productId={productId} />
    </Suspense>
  )
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
