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
import { Link } from '@tanstack/react-router'
import { useDisputeListData } from '@web/pages/authed/disputes/hooks/use-dispute-list-data'
import {
  useDisputeListFilters,
  type WorkflowStatus,
} from '@web/pages/authed/disputes/hooks/use-dispute-list-filters'
import { useSyncDisputesMutation } from '@web/pages/authed/disputes/hooks/use-sync-disputes-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import { Skeleton } from '@web/ui/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/ui/components/ui/table'
import { useCallback, useMemo, type ComponentProps, type ReactNode } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const sortableColumns = {
  evidenceDueBy: 'Evidence due',
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

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const syncTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const statusFilterTrigger = <Button type="button" variant="secondary" size="sm" />

export function DisputesPage() {
  const filters = useDisputeListFilters()
  const { disputes, isError, isLoading, lastSyncedAt, retry } = useDisputeListData(
    filters.listInput,
  )
  const syncMutation = useSyncDisputesMutation()

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
              <ArrowClockwiseIcon data-icon="inline-start" />
              {syncMutation.isPending ? 'Syncing' : 'Sync now'}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[24%] min-w-44">Dispute</TableHead>
                <TableHead className="w-[14%] min-w-32">Customer</TableHead>
                <TableHead className="w-[14%] min-w-36">Status</TableHead>
                <TableHead className="w-[16%] min-w-40">Required action</TableHead>
                <SortableTableHead
                  field="amount"
                  sort={filters.sort}
                  className="w-[9%] min-w-24"
                  disabled={isLoading}
                  onSortChange={filters.setSort}
                />
                <SortableTableHead
                  field="evidenceDueBy"
                  sort={filters.sort}
                  className="w-[11%] min-w-32"
                  disabled={isLoading}
                  onSortChange={filters.setSort}
                />
                <SortableTableHead
                  field="stripeCreatedAt"
                  sort={filters.sort}
                  className="w-[9%] min-w-28"
                  disabled={isLoading}
                  onSortChange={filters.setSort}
                />
                <TableHead className="w-[3%] min-w-12 text-center">Link</TableHead>
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
                disputes.map((dispute) => <DisputeRow key={dispute.disputeId} dispute={dispute} />)
              )}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
    <span className="text-xs text-muted-foreground">
      Last sync: <span className="text-system">{formatLastSyncedAt(lastSyncedAt, isLoading)}</span>
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

function DisputeRow({ dispute }: { dispute: DisputeCaseListItem }) {
  return (
    <TableRow>
      <TableCell className="w-[24%] min-w-44">
        <div className="grid min-w-0 gap-1">
          <DisputeDetailLink disputeId={dispute.disputeId} />
          <span className="truncate text-muted-foreground">
            {formatStatusLabel(dispute.reason)}
          </span>
        </div>
      </TableCell>
      <TableCell className="w-[14%] min-w-32 truncate text-muted-foreground">
        Unknown customer
      </TableCell>
      <TableCell className="w-[14%] min-w-36">
        <Badge variant={workflowStatusBadgeVariants[dispute.workflowStatus]}>
          {formatStatusLabel(dispute.workflowStatus)}
        </Badge>
      </TableCell>
      <TableCell className="w-[16%] min-w-40 truncate">
        {getRequiredAction(dispute.workflowStatus)}
      </TableCell>
      <TableCell className="w-[9%] min-w-24 text-system font-medium tabular-nums">
        {formatMoney(dispute.amount)}
      </TableCell>
      <TableCell className="w-[11%] min-w-32 text-system">
        {formatDate(dispute.evidenceDueBy)}
      </TableCell>
      <TableCell className="w-[9%] min-w-28 text-system">
        {formatDate(dispute.stripeCreatedAt)}
      </TableCell>
      <TableCell className="w-[3%] min-w-12 text-center">
        <a
          href={getStripeDashboardUrl(dispute.disputeId)}
          target="_blank"
          rel="noreferrer"
          aria-label="Open dispute in Stripe"
          className="inline-flex size-7 items-center justify-center text-foreground"
        >
          <ArrowSquareOutIcon />
        </a>
      </TableCell>
    </TableRow>
  )
}

function DisputeDetailLink({ disputeId }: { disputeId: string }) {
  const params = useMemo(() => ({ disputeId }), [disputeId])

  return (
    <Link
      to="/disputes/$disputeId"
      params={params}
      className="block truncate text-system font-medium underline-offset-4 hover:underline"
    >
      {disputeId}
    </Link>
  )
}

function DisputesLoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 8 }, (_cell, cellIndex) => (
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
      <TableCell colSpan={8} className="h-44">
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
      <TableCell colSpan={8} className="h-44">
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

function formatDate(value: string | null) {
  if (!value) return 'No deadline'

  return dateFormatter.format(new Date(value))
}

function formatLastSyncedAt(value: Date | null, isLoading: boolean) {
  if (!value) return isLoading ? '--' : 'never'

  return syncTimestampFormatter.format(value)
}

function getRequiredAction(status: WorkflowStatus) {
  switch (status) {
    case 'received':
      return 'N/A'
    case 'evaluated':
      return 'Start enrichment'
    case 'collecting_evidence':
      return 'N/A'
    case 'awaiting_human':
      return 'Add missing proof'
    case 'completed':
      return 'N/A'
    case 'failed':
      return 'Fix failed run'
    default:
      return assertNever()
  }
}

function assertNever(): never {
  throw new Error('Unhandled dispute workflow status')
}

function getStripeDashboardUrl(disputeId: string) {
  return `https://dashboard.stripe.com/test/disputes/${disputeId}`
}
