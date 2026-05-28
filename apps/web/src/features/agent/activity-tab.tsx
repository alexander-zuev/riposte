import type { DisputeCaseMessage } from '@riposte/core/client'
import { SparkleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useDisputeCaseMessages } from '@web/entities/disputes/use-dispute-case-messages'
import type { AgentMode } from '@web/features/agent/agent-mode'
import { MessageParts } from '@web/features/agent/message-part'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@web/ui/components/ai-elements/conversation'
import { Message, MessageContent } from '@web/ui/components/ai-elements/message'
import { Button } from '@web/ui/components/ui/button'
import { Skeleton } from '@web/ui/components/ui/skeleton'
import type { UIMessage } from 'ai'

type ActivityTabProps = {
  mode: AgentMode
  productId: string
}

/**
 * Read-only dispute-run message surface. The layout intentionally mirrors the
 * chat tab height so switching tabs does not resize the agent card.
 */
export function ActivityTab({ mode, productId }: ActivityTabProps) {
  const { groups, isPending, isError, error, refetch } = useDisputeCaseMessages({
    productId,
    disputeCaseLimit: 15,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isPending ? (
        <ActivityLoading />
      ) : isError ? (
        <ActivityError error={error} onRetry={async () => refetch()} />
      ) : groups.length === 0 ? (
        <ActivityEmpty mode={mode} />
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {groups.map((group) => (
              <section key={group.disputeCaseId} className="flex flex-col gap-3">
                <header className="flex items-center justify-between gap-3 border-b border-border pb-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{group.disputeCaseId}</p>
                    <small className="text-muted-foreground">
                      Message created {formatActivityTimestamp(group.latestCreatedAt)}
                    </small>
                  </div>
                </header>
                {group.messages.map((message) => (
                  <ActivityMessage key={message.id} message={message} />
                ))}
              </section>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}
    </div>
  )
}

function ActivityMessage({ message }: { message: DisputeCaseMessage }) {
  return (
    <Message from={message.role}>
      <MessageContent>
        <MessageParts parts={message.parts as UIMessage<never>['parts']} />
      </MessageContent>
    </Message>
  )
}

function ActivityLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 bg-surface p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

function ActivityError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-2 bg-surface px-6 py-12 text-center">
      <WarningCircleIcon weight="duotone" className="size-8 text-destructive" />
      <strong className="text-destructive">Could not load activity</strong>
      <small className="text-muted-foreground">{error.message}</small>
      <Button size="sm" variant="secondary" className="mt-2" onClick={onRetry}>
        Retry
      </Button>
    </section>
  )
}

function ActivityEmpty({ mode }: { mode: AgentMode }) {
  const empty = emptyStateFor(mode)
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-2 bg-surface px-6 py-12 text-center">
      <SparkleIcon weight="duotone" className="size-8 text-muted-foreground" />
      <strong>{empty.title}</strong>
      <small className="text-muted-foreground">{empty.message}</small>
    </section>
  )
}

function emptyStateFor(mode: AgentMode): { title: string; message: string } {
  if (mode === 'setup') {
    return {
      title: 'No activity yet',
      message: 'Connect your data sources and run the dry-run to populate the audit feed',
    }
  }
  return {
    title: 'Agent is idle',
    message: "As disputes come in, the agent's actions will appear here",
  }
}

function formatActivityTimestamp(value: string): string {
  if (!value) return 'unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
