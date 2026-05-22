import { GaugeIcon } from '@phosphor-icons/react'
import { ContextUsagePopover } from '@web/features/agent/context-usage-popover'
import { formatTokens } from '@web/features/agent/format-tokens'
import type { DisputeAgentContextState } from '@web/features/agent/hooks/use-dispute-agent-chat'
import { useEffect, useRef, useState } from 'react'

const MS_IN_S = 1000

type ContextUsageMeterProps = {
  className?: string
  context: DisputeAgentContextState
  /** Fired when the user clicks Cancel inside the popover's compacting banner. */
  onCancelCompaction: () => void
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
}: ContextUsageMeterProps) {
  const compactionDuration = useCompactionDuration(context.compaction.status === 'compacting')
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
function useCompactionDuration(isCompacting: boolean): number {
  const startTimeRef = useRef<number | null>(null)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (isCompacting) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now()
        setDuration(0)
      }
      const interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / MS_IN_S))
        }
      }, MS_IN_S)
      return () => clearInterval(interval)
    }

    startTimeRef.current = null
    setDuration(0)
    return undefined
  }, [isCompacting])

  return duration
}
