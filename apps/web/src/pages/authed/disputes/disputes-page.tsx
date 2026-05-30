import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  FunnelSimpleIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import {
  DISPUTE_CASE_WORKFLOW_STATUSES,
  type DisputeCaseListItem,
  type DisputeCaseSort,
  type DisputeCaseSortField,
} from '@riposte/core/client'
import { useNavigate } from '@tanstack/react-router'
import { formatInTimeZone } from '@web/lib/datetime'
import { useTimezone } from '@web/lib/hooks/use-timezone'
import { cn } from '@web/lib/utils'
import { useDisputeListData } from '@web/pages/authed/disputes/hooks/use-dispute-list-data'
import {
  useDisputeListFilters,
  type WorkflowStatus,
} from '@web/pages/authed/disputes/hooks/use-dispute-list-filters'
import { useSyncDisputesMutation } from '@web/pages/authed/disputes/hooks/use-sync-disputes-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Badge } from '@web/ui/components/ui/badge'
import { Button, buttonVariants } from '@web/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@web/ui/components/ui/hover-card'
import { Skeleton } from '@web/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/ui/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@web/ui/components/ui/tooltip'
import {
  useCallback,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const sortableColumns = {
  evidenceDueBy: 'Deadline',
  stripeCreatedAt: 'Created',
  amount: 'Amount',
} as const satisfies Record<DisputeCaseSortField, string>

const workflowStatusBadgeVariants = {
  received: 'secondary',
  evaluated: 'info',
  collecting_evidence: 'info',
  awaiting_human: 'warning',
  completed: 'success',
  failed: 'destructive',
} as const satisfies Record<WorkflowStatus, BadgeVariant>

const workflowStatusDescriptions = {
  received: 'Riposte has synced the dispute and is ready to triage it',
  evaluated: 'Riposte has decided how this dispute should be handled',
  collecting_evidence: 'Riposte is collecting product evidence for this dispute',
  awaiting_human: 'Riposte needs review or approval before continuing',
  completed: 'Riposte has finished handling this dispute',
  failed: 'Riposte hit an error while handling this dispute',
} as const satisfies Record<WorkflowStatus, string>

const stripeStatusBadgeVariants = {
  lost: 'destructive',
  needs_response: 'warning',
  prevented: 'success',
  under_review: 'info',
  warning_closed: 'secondary',
  warning_needs_response: 'warning',
  warning_under_review: 'info',
  won: 'success',
} as const satisfies Record<DisputeCaseListItem['stripeStatus'], BadgeVariant>

const stripeStatusDescriptions = {
  lost: 'Stripe reports the dispute was lost',
  needs_response: 'Stripe is waiting for evidence',
  prevented: 'Stripe reports the dispute was prevented',
  under_review: 'Evidence was submitted and Stripe is waiting on the issuer',
  warning_closed: 'Stripe closed this inquiry warning',
  warning_needs_response: 'Stripe is waiting for evidence on an inquiry warning',
  warning_under_review: 'Evidence was submitted for an inquiry warning',
  won: 'Stripe reports the dispute was won',
} as const satisfies Record<DisputeCaseListItem['stripeStatus'], string>

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const exactDeadlineFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  year: 'numeric',
} as const satisfies Intl.DateTimeFormatOptions
const syncTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
})

const statusFilterTrigger = <Button type="button" variant="secondary" size="sm" />

export function DisputesPage({ productId }: { productId: string }) {
  const filters = useDisputeListFilters()
  const { disputes, isError, isLoading, lastSyncedAt, retry } = useDisputeListData(
    productId,
    filters.listInput,
  )
  const syncMutation = useSyncDisputesMutation(productId)

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Disputes"
        description="Review synced Stripe disputes by deadline, workflow state, and amount at risk"
        eyebrow="Disputes"
        icon={ListChecksIcon}
      />

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DisputesToolbar
              selectedStatuses={filters.selectedStatuses}
              onSelectedStatusesChange={filters.setSelectedStatuses}
              disabled={isLoading}
            />
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              size="sm"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <ArrowClockwiseIcon
                data-icon="inline-start"
                className={syncMutation.isPending ? 'animate-spin' : undefined}
              />
              Sync now
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[23%] min-w-44">Dispute</TableHead>
                <TableHead className="w-[18%] min-w-32">Customer</TableHead>
                <TableHead className="w-[14%] min-w-32">Workflow</TableHead>
                <TableHead className="w-[14%] min-w-32">Stripe</TableHead>
                <SortableTableHead
                  field="amount"
                  sort={filters.sort}
                  className="w-[11%] min-w-24"
                  disabled={isLoading}
                  onSortChange={filters.setSort}
                />
                <SortableTableHead
                  field="evidenceDueBy"
                  sort={filters.sort}
                  className="w-[16%] min-w-36"
                  disabled={isLoading}
                  onSortChange={filters.setSort}
                />
                <TableHead className="w-[4%] min-w-12 text-center">
                  <span className="sr-only">Stripe link</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DisputesLoadingRows />
              ) : isError ? (
                <DisputesErrorRow onRetry={retry} />
              ) : disputes.length === 0 ? (
                <DisputesEmptyRow hasFilters={filters.hasSelectedStatuses} />
              ) : (
                disputes.map((dispute) => (
                  <DisputeRow key={dispute.disputeId} dispute={dispute} productId={productId} />
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 px-2">
            <SyncStateLabel lastSyncedAt={lastSyncedAt} isLoading={isLoading} />
            <TableStateLabel shownCount={disputes.length} isError={isError} isLoading={isLoading} />
          </div>
        </div>
      </section>
    </div>
  )
}

function SyncStateLabel({
  lastSyncedAt,
  isLoading,
}: {
  lastSyncedAt: Date | null
  isLoading: boolean
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      Last sync:{' '}
      {isLoading ? (
        <Skeleton className="inline-block h-3 w-24" />
      ) : (
        <span className="text-system">{formatLastSyncedAt(lastSyncedAt)}</span>
      )}
    </span>
  )
}

function DisputesToolbar({
  selectedStatuses,
  onSelectedStatusesChange,
  disabled,
}: {
  selectedStatuses: WorkflowStatus[]
  onSelectedStatusesChange: (statuses: WorkflowStatus[]) => void
  disabled: boolean
}) {
  const label =
    selectedStatuses.length === 0
      ? 'All statuses'
      : selectedStatuses.length === 1
        ? formatStatusLabel(selectedStatuses[0] ?? '')
        : `${selectedStatuses.length} statuses`

  const handleClearFilters = useCallback(() => {
    onSelectedStatusesChange([])
  }, [onSelectedStatusesChange])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={statusFilterTrigger} disabled={disabled}>
          <FunnelSimpleIcon data-icon="inline-start" />
          {label}
          <CaretDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {DISPUTE_CASE_WORKFLOW_STATUSES.map((status) => (
              <StatusFilterOption
                key={status}
                status={status}
                selectedStatuses={selectedStatuses}
                onSelectedStatusesChange={onSelectedStatusesChange}
              />
            ))}
          </DropdownMenuGroup>
          {selectedStatuses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </Button>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function StatusFilterOption({
  status,
  selectedStatuses,
  onSelectedStatusesChange,
}: {
  status: WorkflowStatus
  selectedStatuses: WorkflowStatus[]
  onSelectedStatusesChange: (statuses: WorkflowStatus[]) => void
}) {
  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      onSelectedStatusesChange(
        checked
          ? [...selectedStatuses, status]
          : selectedStatuses.filter((selected) => selected !== status),
      )
    },
    [onSelectedStatusesChange, selectedStatuses, status],
  )

  return (
    <DropdownMenuCheckboxItem
      checked={selectedStatuses.includes(status)}
      onCheckedChange={handleCheckedChange}
    >
      {formatStatusLabel(status)}
    </DropdownMenuCheckboxItem>
  )
}

function SortableTableHead({
  field,
  sort,
  onSortChange,
  disabled,
  className,
}: {
  field: DisputeCaseSortField
  sort: DisputeCaseSort
  onSortChange: (sort: DisputeCaseSort) => void
  disabled: boolean
  className?: string
}) {
  const isActive = sort.field === field
  const Icon = isActive ? (sort.direction === 'asc' ? CaretUpIcon : CaretDownIcon) : CaretUpDownIcon
  const handleSort = useCallback(() => {
    onSortChange({
      field,
      direction: isActive && sort.direction === 'asc' ? 'desc' : 'asc',
    })
  }, [field, isActive, onSortChange, sort.direction])

  return (
    <TableHead className={className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2"
        disabled={disabled}
        onClick={handleSort}
      >
        {sortableColumns[field]}
        <Icon data-icon="inline-end" />
      </Button>
    </TableHead>
  )
}

function DisputeRow({ dispute, productId }: { dispute: DisputeCaseListItem; productId: string }) {
  const navigate = useNavigate()
  const handleOpenDetail = useCallback(() => {
    void navigate({
      to: '/products/$productId/disputes/$disputeId',
      params: { productId, disputeId: dispute.disputeId },
    })
  }, [navigate, productId, dispute.disputeId])
  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key !== 'Enter') return
      handleOpenDetail()
    },
    [handleOpenDetail],
  )
  const handleStripeLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation()
  }, [])
  const handleStripeLinkKeyDown = useCallback((event: KeyboardEvent<HTMLAnchorElement>) => {
    event.stopPropagation()
  }, [])

  return (
    <TableRow
      role="link"
      tabIndex={0}
      aria-label={`Open dispute ${dispute.disputeId}`}
      className="group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      onClick={handleOpenDetail}
      onKeyDown={handleRowKeyDown}
    >
      <TableCell className="w-[23%] min-w-44">
        <div className="grid min-w-0 gap-1">
          <span className="block truncate text-system font-medium underline-offset-4 group-hover:underline">
            {dispute.disputeId}
          </span>
          <span className="truncate text-muted-foreground">
            {formatStatusLabel(dispute.reason)}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-[18%] min-w-32">
        <div className="grid min-w-0 gap-1">
          <span className="truncate">{dispute.customerName ?? 'Unknown customer'}</span>
          {dispute.customerEmail && (
            <span className="truncate text-muted-foreground">{dispute.customerEmail}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[14%] min-w-32">
        <StatusTooltip content={workflowStatusDescriptions[dispute.workflowStatus]}>
          <Badge variant={workflowStatusBadgeVariants[dispute.workflowStatus]}>
            {formatStatusLabel(dispute.workflowStatus)}
          </Badge>
        </StatusTooltip>
      </TableCell>
      <TableCell className="w-[14%] min-w-32">
        <StatusTooltip content={stripeStatusDescriptions[dispute.stripeStatus]}>
          <Badge variant={stripeStatusBadgeVariants[dispute.stripeStatus]}>
            {formatStatusLabel(dispute.stripeStatus)}
          </Badge>
        </StatusTooltip>
      </TableCell>
      <TableCell className="w-[11%] min-w-24 text-system font-medium tabular-nums">
        {formatMoney(dispute.amount)}
      </TableCell>
      <TableCell className="w-[16%] min-w-36 text-system">
        <DeadlineCell value={dispute.evidenceDueBy} />
      </TableCell>
      <TableCell className="w-[4%] min-w-12 text-center">
        <a
          href={getStripeDashboardUrl(dispute.disputeId)}
          target="_blank"
          rel="noreferrer"
          aria-label="Open dispute in Stripe"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-foreground')}
          onClick={handleStripeLinkClick}
          onKeyDown={handleStripeLinkKeyDown}
        >
          <ArrowSquareOutIcon />
        </a>
      </TableCell>
    </TableRow>
  )
}

function StatusTooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}

function DeadlineCell({ value }: { value: string | null }) {
  const timeZone = useTimezone()
  const deadline = getDeadlineDisplay(value, timeZone)

  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="inline-flex" />}>
        <span className={cn('font-medium tabular-nums', deadline.tone)}>{deadline.label}</span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="grid gap-2">
        <span className="text-muted-foreground">{deadline.description}</span>
        {deadline.exact ? (
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Your time</span>
              <span className="font-medium text-foreground">{deadline.exact}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">UTC</span>
              <span className="font-medium text-foreground">{deadline.exactUtc}</span>
            </div>
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}

function DisputesLoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 7 }, (_cell, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton className="h-5 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

function DisputesEmptyRow({ hasFilters }: { hasFilters: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-44">
        <TableMessage
          icon={hasFilters ? MagnifyingGlassIcon : ListChecksIcon}
          title={hasFilters ? 'No matching disputes' : 'No disputes yet'}
          description={
            hasFilters
              ? 'Adjust the selected statuses to broaden the dispute list'
              : 'Synced Stripe disputes will appear here when Riposte receives them'
          }
        />
      </TableCell>
    </TableRow>
  )
}

function DisputesErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-44">
        <TableMessage
          icon={WarningIcon}
          title="Could not load disputes"
          description="The dispute list failed to load. Retry the query or check the server logs"
        >
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            <ArrowClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </TableMessage>
      </TableCell>
    </TableRow>
  )
}

function TableMessage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ListChecksIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto grid max-w-sm place-items-center gap-2 text-center">
      <Icon weight="duotone" className="size-5 text-muted-foreground" />
      <div className="grid gap-1">
        <strong>{title}</strong>
        <span className="text-muted-foreground">{description}</span>
      </div>
      {children}
    </div>
  )
}

function TableStateLabel({
  shownCount,
  isError,
  isLoading,
}: {
  shownCount: number
  isError: boolean
  isLoading: boolean
}) {
  if (isLoading)
    return (
      <Badge variant="secondary" className="text-system tabular-nums">
        -- shown
      </Badge>
    )
  if (isError)
    return (
      <Badge variant="secondary" className="text-system tabular-nums">
        0 shown
      </Badge>
    )

  return (
    <Badge variant="secondary" className="text-system tabular-nums">
      {shownCount} shown
    </Badge>
  )
}

function formatStatusLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMoney(money: DisputeCaseListItem['amount']) {
  return new Intl.NumberFormat('en-US', {
    ...moneyFormatter.resolvedOptions(),
    currency: money.currency.toUpperCase(),
  }).format(money.amountMinor / 100)
}

function getDeadlineDisplay(
  value: string | null,
  timeZone: string,
): {
  label: string
  description: string
  exact: string | null
  exactUtc: string | null
  tone: string
} {
  if (!value) {
    return {
      label: 'No deadline',
      description: 'Stripe did not provide an evidence deadline for this dispute',
      exact: null,
      exactUtc: null,
      tone: 'text-muted-foreground',
    }
  }

  const deadline = new Date(value)
  const exact = formatInTimeZone(value, timeZone, exactDeadlineFormatOptions) ?? value
  const exactUtc = formatInTimeZone(value, 'UTC', exactDeadlineFormatOptions) ?? value
  const daysUntilDeadline = getTimeZoneCalendarDayDifference(new Date(), deadline, timeZone)

  if (daysUntilDeadline < 0) {
    return {
      label: 'Past due',
      description: 'Stripe no longer accepts evidence for this deadline',
      exact,
      exactUtc,
      tone: 'text-destructive',
    }
  }

  if (daysUntilDeadline === 0) {
    return {
      label: 'Due today',
      description: 'Submit evidence before the Stripe deadline expires',
      exact,
      exactUtc,
      tone: 'text-warning',
    }
  }

  if (daysUntilDeadline === 1) {
    return {
      label: 'Due tomorrow',
      description: 'Submit evidence before the Stripe deadline expires',
      exact,
      exactUtc,
      tone: 'text-warning',
    }
  }

  return {
    label: `Due in ${daysUntilDeadline} days`,
    description: 'Deadline for submitting evidence to Stripe',
    exact,
    exactUtc,
    tone: daysUntilDeadline <= 3 ? 'text-warning' : 'text-muted-foreground',
  }
}

function getTimeZoneCalendarDayDifference(from: Date, to: Date, timeZone: string) {
  const fromDay = getTimeZoneCalendarDay(from, timeZone)
  const toDay = getTimeZoneCalendarDay(to, timeZone)

  return Math.ceil((toDay - fromDay) / 86_400_000)
}

function getTimeZoneCalendarDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return Date.UTC(value('year'), value('month') - 1, value('day'))
}

function formatLastSyncedAt(value: Date | null) {
  if (!value) return 'never'

  return syncTimestampFormatter.format(value)
}

function getStripeDashboardUrl(disputeId: string) {
  return `https://dashboard.stripe.com/test/disputes/${disputeId}`
}
