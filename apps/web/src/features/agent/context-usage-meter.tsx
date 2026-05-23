import { GaugeIcon } from '@phosphor-icons/react'
import { ContextUsagePopover } from '@web/features/agent/context-usage-popover'
import { formatTokens } from '@web/features/agent/format-tokens'
import type { DisputeAgentContextState } from '@web/features/agent/hooks/use-dispute-agent-chat'
import { useEffect, useState } from 'react'

const MS_IN_S = 1000

type ContextUsageMeterProps = {
  className?: string
  context: DisputeAgentContextState
  /** Fired when the user clicks Cancel inside the popover's compacting banner. */
  onCancelCompaction: () => void
  /** Storybook-only escape hatch: render with the popover already open. */
  defaultOpen?: boolean
}

/**
 * Inline pill in the chat footer that surfaces context-window usage. Acts as
 * the trigger for {@link ContextUsagePopover}. Stays neutral by design — the
 * popover surfaces compacting/failed state via its own banner, so the pill
 * doesn't fight for attention with destructive colors in the footer.
 */
export function ContextUsageMeter({
  className,
  context,
  onCancelCompaction,
  defaultOpen,
}: ContextUsageMeterProps) {
  const compactionDuration = useCompactionDuration(context.compaction)
  return (
    <ContextUsagePopover
      context={context}
      label={
        <>
          <GaugeIcon data-icon="inline-start" weight="duotone" />
          {renderLabel(context, compactionDuration)}
        </>
      }
      ariaLabel={getContextAriaLabel(context, compactionDuration)}
      className={className}
      onCancelCompaction={onCancelCompaction}
      defaultOpen={defaultOpen}
    />
  )
}

function renderLabel(
  context: DisputeAgentContextState,
  compactionDuration: number,
): React.ReactNode {
  if (context.compaction.status === 'compacting') {
    return <span>Compacting… {compactionDuration}s</span>
  }
  if (context.compaction.status === 'failed') {
    return <span>Compaction failed</span>
  }
  return (
    <>
      <span>Context:</span>
      <span className="tabular-nums">
        {formatTokens(context.estimatedUsage.total)} / {formatTokens(context.windowTokens)}
      </span>
    </>
  )
}

function getContextAriaLabel(
  context: DisputeAgentContextState,
  compactionDuration: number,
): string {
  if (context.compaction.status === 'compacting') return `Compacting… ${compactionDuration}s`
  if (context.compaction.status === 'failed') return 'Context compaction failed'
  return `Context: ${formatTokens(context.estimatedUsage.total)} of ${formatTokens(
    context.windowTokens,
  )} tokens`
}

/**
 * Ticks every second while a compaction is in flight so the meter label can
 * report elapsed time ("Compacting… 5s"). Returns 0 when idle.
 */
function useCompactionDuration(compaction: DisputeAgentContextState['compaction']): number {
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (compaction.status === 'compacting') {
      const startedAt = new Date(compaction.startedAt).getTime()
      const getDuration = () => Math.max(0, Math.floor((Date.now() - startedAt) / MS_IN_S))
      setDuration(getDuration())
      const interval = setInterval(() => {
        setDuration(getDuration())
      }, MS_IN_S)
      return () => clearInterval(interval)
    }

    setDuration(0)
    return undefined
  }, [compaction])

  return duration
}
