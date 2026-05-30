import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Badge } from '@web/ui/components/ui/badge'

/** Informational status of an agent-maintained artifact (playbook, product facts). */
export function CompletenessBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <Badge variant="success">
      <CheckCircleIcon data-icon="inline-start" />
      Complete
    </Badge>
  ) : (
    <Badge variant="warning">
      <WarningCircleIcon data-icon="inline-start" />
      Incomplete
    </Badge>
  )
}

/** What the agent still needs to complete. Read-only, the user changes it by chatting. */
export function IncompleteList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid max-w-xl gap-2 rounded-md border border-warning/30 bg-warning-muted/30 p-4">
      <small className="font-medium">{title}</small>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <WarningCircleIcon className="size-3.5 shrink-0 text-warning" />
            <small className="text-muted-foreground">{item}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
