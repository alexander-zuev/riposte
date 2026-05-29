import { SparkleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { DisputeCaseMessage } from '@riposte/core/client'
import { Link } from '@tanstack/react-router'
import { useDisputeCaseActivity } from '@web/entities/disputes/use-dispute-case-activity'
import type { AgentMode } from '@web/features/agent/agent-mode'
import { MessageParts } from '@web/features/agent/message-part'
import { formatRelativeTime } from '@web/lib/format-time'
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
  const { cases, isPending, isError, error, refetch } = useDisputeCaseActivity({
    productId,
    disputeCaseLimit: 15,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isPending ? (
        <ActivityLoading />
      ) : isError ? (
        <ActivityError error={error} onRetry={async () => refetch()} />
      ) : cases.length === 0 ? (
        <ActivityEmpty mode={mode} />
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent>
            {cases.map((caseActivity) => (
              <section key={caseActivity.disputeCaseId} className="flex flex-col gap-3">
                <DisputeCaseSeparator
                  productId={productId}
                  disputeCaseId={caseActivity.disputeCaseId}
                  startedAt={caseActivity.messages[0]?.createdAt}
                  stepCount={countSteps(caseActivity.messages)}
                />
                {caseActivity.messages.map((message) => (
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
        <MessageParts parts={message.parts} />
      </MessageContent>
    </Message>
  )
}

/**
 * Steps the agent took, from the `step-start` markers the SDK writes into each
 * turn message. A run is one message now, so row count is not the step count.
 */
function countSteps(messages: DisputeCaseMessage[]): number {
  return messages.reduce(
    (total, message) => total + message.parts.filter((part) => part.type === 'step-start').length,
    0,
  )
}

function DisputeCaseSeparator({
  productId,
  disputeCaseId,
  startedAt,
  stepCount,
}: {
  productId: string
  disputeCaseId: string
  startedAt?: string
  stepCount: number
}) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-2">
        <Link
          to="/products/$productId/disputes/$disputeId"
          params={{ productId, disputeId: disputeCaseId }}
          className="font-mono text-foreground hover:underline"
          title={disputeCaseId}
        >
          {shortenDisputeId(disputeCaseId)}
        </Link>
        <span aria-hidden>·</span>
        <span>
          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
        </span>
        {startedAt ? (
          <>
            <span aria-hidden>·</span>
            <time dateTime={startedAt} title={formatActivityTimestamp(startedAt)}>
              {formatRelativeTime(startedAt)}
            </time>
          </>
        ) : null}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
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

/** `du_1TbnvADTNmjFIavLnaETo1mO` → `du_1TbnvA…To1mO`. Full id is on hover/title. */
function shortenDisputeId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 9)}…${id.slice(-5)}`
}
