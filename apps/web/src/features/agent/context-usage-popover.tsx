import { CaretRightIcon } from '@phosphor-icons/react'
import { createLogger } from '@riposte/core/client'
import { formatTokens } from '@web/features/agent/format-tokens'
import type {
  ContextCategoryUsage,
  DisputeAgentContextState,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { cn } from '@web/lib/utils'
import { Button } from '@web/ui/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@web/ui/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@web/ui/components/ui/popover'
import { useEffect, useState } from 'react'

const logger = createLogger('context-usage-popover')

type ContextUsagePopoverProps = {
  context: DisputeAgentContextState
  /** Trigger content. Callers compose neutral prefix + status-colored value. */
  label: React.ReactNode
  /** Plain-text fallback for assistive tech. */
  ariaLabel: string
  className?: string
  /**
   * Cancel handler shown inside the compacting banner. Only rendered when
   * `context.compaction.status === 'compacting'`; wired to the server via RPC.
   */
  onCancelCompaction: () => void
  /** Storybook-only escape hatch: render with the popover already open. */
  defaultOpen?: boolean
}

/**
 * Click-to-open popover with the per-category context-usage breakdown.
 * Always opens regardless of compaction state — a status banner surfaces
 * compacting/failed inline. Renders buckets generically from the server-side
 * `estimatedUsage.byCategory` so adding a new category requires no UI changes.
 */
export function ContextUsagePopover({
  context,
  label,
  ariaLabel,
  className,
  onCancelCompaction,
  defaultOpen,
}: ContextUsagePopoverProps) {
  const { modelName, windowTokens, estimatedUsage, compaction } = context
  const used = estimatedUsage.total
  const free = Math.max(0, windowTokens - used)
  const usedPct = pct(used, windowTokens)

  useEffect(() => {
    logger.debug('context_usage_popover_render', {
      compactionStatus: compaction.status,
      estimatedInputTokens: estimatedUsage.total,
      usageTotalTokens: context.usage.totalTokens,
    })
  }, [compaction.status, context.usage.totalTokens, estimatedUsage.total])

  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="sm"
            aria-label={ariaLabel}
            className={cn('text-muted-foreground', className)}
          >
            {label}
          </Button>
        }
      />
      <PopoverContent side="top" align="end" className="max-h-[70vh] w-[360px] gap-0 p-0 text-xs">
        <ContextUsageHeader compaction={compaction} onCancelCompaction={onCancelCompaction} />

        <div className="flex gap-3 px-3 py-3 text-xs">
          <CategoryFillBar buckets={estimatedUsage.byCategory} window={windowTokens} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-right text-muted-foreground">
              <span className="font-mono">{modelName}</span> ({formatTokens(windowTokens)})
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1">
              <SummaryRow label="Total usage (est)" tokens={used} window={windowTokens} highlight />
              <div className="col-span-3 border-t border-border" />
              {estimatedUsage.byCategory.map((bucket) => (
                <CategoryGridRow key={bucket.category} bucket={bucket} window={windowTokens} />
              ))}
              <CategoryGridRow
                bucket={{
                  label: 'Free space',
                  category: 'messages',
                  tokens: free,
                }}
                window={windowTokens}
                muted
                hideDot
              />
            </div>
          </div>
        </div>

        <ToolsSection buckets={estimatedUsage.byCategory} />
      </PopoverContent>
    </Popover>
  )
}

function ContextUsageHeader({
  compaction,
  onCancelCompaction,
}: {
  compaction: DisputeAgentContextState['compaction']
  onCancelCompaction: () => void
}) {
  if (compaction.status === 'compacting') {
    return (
      <PopoverHeader className="flex-row items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <PopoverTitle className="text-xs">Compacting older messages…</PopoverTitle>
        <Button variant="ghost" size="xs" onClick={onCancelCompaction}>
          Cancel
        </Button>
      </PopoverHeader>
    )
  }
  if (compaction.status === 'failed') {
    return (
      <PopoverHeader className="border-b border-border bg-destructive-muted px-3 py-2 text-destructive-muted-foreground">
        <PopoverTitle className="text-xs">Compaction failed</PopoverTitle>
        <PopoverDescription className="text-xs text-destructive-muted-foreground/80">
          {compaction.message}
        </PopoverDescription>
      </PopoverHeader>
    )
  }
  return (
    <PopoverHeader className="border-b border-border px-3 py-2">
      <PopoverTitle className="text-xs">Context usage</PopoverTitle>
    </PopoverHeader>
  )
}

const CATEGORY_DOT_CLASS: Record<ContextCategoryUsage['category'], string> = {
  system_prompt: 'bg-chart-1',
  system_tools: 'bg-chart-2',
  mcp_tools: 'bg-chart-3',
  messages: 'bg-chart-4',
}

function SummaryRow({
  label,
  tokens,
  window,
  highlight,
}: {
  label: string
  tokens: number
  window: number
  highlight?: boolean
}) {
  return (
    <>
      <span className={cn('truncate', highlight && 'font-medium')}>{label}</span>
      <span className={cn('text-right tabular-nums', highlight && 'font-medium')}>
        {formatTokens(tokens)} / {formatTokens(window)}
      </span>
      <span className="text-right text-muted-foreground tabular-nums">{pct(tokens, window)}%</span>
    </>
  )
}

function CategoryGridRow({
  bucket,
  window,
  muted,
  hideDot,
}: {
  bucket: ContextCategoryUsage
  window: number
  muted?: boolean
  hideDot?: boolean
}) {
  return (
    <>
      <span className={cn('flex items-center gap-2 truncate', muted && 'text-muted-foreground')}>
        {!hideDot && (
          <span
            aria-hidden
            className={cn('size-2 shrink-0 rounded-sm', CATEGORY_DOT_CLASS[bucket.category])}
          />
        )}
        {hideDot && (
          <span aria-hidden className="size-2 shrink-0 rounded-sm border border-border" />
        )}
        <span className="truncate">{bucket.label}</span>
      </span>
      <span className={cn('text-right tabular-nums', muted && 'text-muted-foreground')}>
        {formatTokens(bucket.tokens)}
      </span>
      <span className="text-right text-muted-foreground tabular-nums">
        {pct(bucket.tokens, window)}%
      </span>
    </>
  )
}

function CategoryFillBar({ buckets, window }: { buckets: ContextCategoryUsage[]; window: number }) {
  return (
    <div
      aria-hidden
      className="flex w-2 shrink-0 flex-col overflow-hidden rounded-sm border border-border bg-muted"
    >
      {buckets.map((bucket) => (
        <span
          key={bucket.category}
          className={cn('w-full', CATEGORY_DOT_CLASS[bucket.category])}
          style={{ flexBasis: `${pctNum(bucket.tokens, window)}%`, flexGrow: 0, flexShrink: 0 }}
        />
      ))}
    </div>
  )
}

function ToolsSection({ buckets }: { buckets: ContextCategoryUsage[] }) {
  const systemTools = buckets.find((b) => b.category === 'system_tools')
  const mcpTools = buckets.find((b) => b.category === 'mcp_tools')
  const systemChildren = systemTools?.children ?? []
  const mcpChildren = mcpTools?.children ?? []
  const totalCount = systemChildren.length + mcpChildren.length
  const [open, setOpen] = useState(false)

  if (totalCount === 0) return null

  return (
    <div className="border-t border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="default" className="w-full justify-start gap-2 px-3">
              <CaretRightIcon
                className={cn('size-3 transition-transform', open && 'rotate-90')}
                aria-hidden
              />
              <span className="flex-1 text-left">Tools</span>
              <span className="text-muted-foreground tabular-nums">{totalCount}</span>
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="max-h-64 overflow-y-auto px-3 pb-2 text-xs">
            {systemChildren.length > 0 && <ToolGroup title="System" tools={systemChildren} />}
            {mcpChildren.length > 0 && <ToolGroup title="MCP" tools={mcpChildren} />}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ToolGroup({ title, tools }: { title: string; tools: ContextCategoryUsage[] }) {
  return (
    <div className="pb-1">
      <div className="sticky top-0 bg-popover py-1 text-xs font-medium tracking-wide text-foreground uppercase">
        {title} · {tools.length}
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {tools.map((tool) => (
          <li key={tool.label} className="flex items-center gap-2 text-xs tabular-nums">
            <span className="flex-1 truncate">{tool.label}</span>
            <span>{formatTokens(tool.tokens)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function pct(value: number, total: number): string {
  return pctNum(value, total).toFixed(1)
}

function pctNum(value: number, total: number): number {
  if (total <= 0) return 0
  return (value * 100) / total
}
