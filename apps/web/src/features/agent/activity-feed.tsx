import { type Icon, SparkleIcon } from '@phosphor-icons/react'
import { Card } from '@web/ui/components/ui/card'

export type AgentActivityEntry = {
  id: string
  icon: Icon
  title: string
  meta?: string
  timestamp: string
}

type ActivityFeedProps = {
  entries: AgentActivityEntry[]
  emptyTitle: string
  emptyMessage: string
}

/**
 * Audit-style feed used by the agent's Activity tab. Same atom for setup
 * milestones (audit log of "Connected Stripe", "Generated draft playbook")
 * and post-setup dispute operations. Empty state messaging is caller-owned
 * so the same atom carries every mode's voice.
 */
export function ActivityFeed({ entries, emptyTitle, emptyMessage }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <section className="flex flex-col items-center gap-2 border border-dashed bg-surface px-6 py-12 text-center">
        <SparkleIcon weight="duotone" className="size-8 text-muted-foreground" />
        <strong>{emptyTitle}</strong>
        <small className="text-muted-foreground">{emptyMessage}</small>
      </section>
    )
  }
  return (
    <Card className="py-0">
      <ol className="divide-y">
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </Card>
  )
}

function ActivityRow({ entry }: { entry: AgentActivityEntry }) {
  const Icon = entry.icon
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <Icon weight="duotone" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">{entry.title}</p>
          {entry.meta ? <small className="block text-muted-foreground">{entry.meta}</small> : null}
        </div>
        <small className="shrink-0 whitespace-nowrap text-muted-foreground">
          {entry.timestamp}
        </small>
      </div>
    </li>
  )
}
