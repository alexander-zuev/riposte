import type { AgentTransportState } from '@web/features/agent/hooks/use-dispute-agent-chat'
import { cn } from '@web/lib/utils'

type ConnectionIndicatorProps = {
  state: AgentTransportState
  className?: string
}

const STATE_STYLES: Record<AgentTransportState, string> = {
  connecting: 'bg-warning animate-pulse',
  connected: 'bg-success',
  closing: 'bg-muted-foreground',
  disconnected: 'bg-muted-foreground',
}

const STATE_LABELS: Record<AgentTransportState, string> = {
  connecting: 'Connecting',
  connected: 'Connected',
  closing: 'Closing',
  disconnected: 'Disconnected',
}

export function ConnectionIndicator({ state, className }: ConnectionIndicatorProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1.5 text-muted-foreground text-xs', className)}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', STATE_STYLES[state])} />
      <span>{STATE_LABELS[state]}</span>
    </div>
  )
}
