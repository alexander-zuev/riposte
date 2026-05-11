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
  type DisputeCaseWorkflowStatus,
} from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { disputeQueries, type ListDisputeCasesInput } from '@web/entities/disputes/dispute-queries'
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
import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const sortableColumns = {
  evidenceDueBy: 'Evidence due',
  stripeCreatedAt: 'Created',
  amount: 'Amount',
} as const satisfies Record<DisputeCaseSortField, string>

const workflowStatusBadgeVariants = {
  received: 'secondary',
  triaged: 'info',
  collecting_evidence: 'info',
  needs_input: 'warning',
  ready_for_review: 'accent',
  submitted: 'info',
  accepted: 'success',
  ignored: 'secondary',
  deadline_missed: 'destructive',
  won: 'success',
  lost: 'destructive',
  failed: 'destructive',
} as const satisfies Record<DisputeCaseWorkflowStatus, BadgeVariant>

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const statusFilterTrigger = <Button type="button" variant="secondary" size="sm" />

export function DisputesPage() {
  const [selectedStatuses, setSelectedStatuses] = useState<DisputeCaseWorkflowStatus[]>([])
  const [sort, setSort] = useState<DisputeCaseSort>({
    field: 'evidenceDueBy',
    direction: 'asc',
  })
  const listInput = useMemo<ListDisputeCasesInput>(
    () => ({
      limit: 20,
      sort,
      filters:
        selectedStatuses.length > 0
          ? {
              statuses: selectedStatuses,
            }
          : undefined,
    }),
    [selectedStatuses, sort],
  )
  const disputesQuery = useQuery(disputeQueries.list(listInput))
  const disputes = disputesQuery.data?.items ?? []
  const handleRetry = useCallback(() => {
    disputesQuery.refetch().catch(() => undefined)
  }, [disputesQuery])

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
          <DisputesToolbar
            selectedStatuses={selectedStatuses}
            onSelectedStatusesChange={setSelectedStatuses}
            disabled={disputesQuery.isLoading}
          />
          <div className="shrink-0">
            <TableStateLabel
              shownCount={disputes.length}
              isError={disputesQuery.isError}
              isLoading={disputesQuery.isLoading}
            />
          </div>
        </div>

        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%] min-w-44">Dispute</TableHead>
              <TableHead className="w-[14%] min-w-32">Customer</TableHead>
              <TableHead className="w-[14%] min-w-36">Status</TableHead>
              <TableHead className="w-[16%] min-w-40">Required action</TableHead>
              <SortableTableHead
                field="amount"
                sort={sort}
                className="w-[9%] min-w-24"
                disabled={disputesQuery.isLoading}
                onSortChange={setSort}
              />
              <SortableTableHead
                field="evidenceDueBy"
                sort={sort}
                className="w-[11%] min-w-32"
                disabled={disputesQuery.isLoading}
                onSortChange={setSort}
              />
              <SortableTableHead
                field="stripeCreatedAt"
                sort={sort}
                className="w-[9%] min-w-28"
                disabled={disputesQuery.isLoading}
                onSortChange={setSort}
              />
              <TableHead className="w-[3%] min-w-12 text-center">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputesQuery.isLoading ? (
              <DisputesLoadingRows />
            ) : disputesQuery.isError ? (
              <DisputesErrorRow onRetry={handleRetry} />
            ) : disputes.length === 0 ? (
              <DisputesEmptyRow hasFilters={selectedStatuses.length > 0} />
            ) : (
              disputes.map((dispute) => <DisputeRow key={dispute.disputeId} dispute={dispute} />)
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}

function DisputesToolbar({
  selectedStatuses,
  onSelectedStatusesChange,
  disabled,
}: {
  selectedStatuses: DisputeCaseWorkflowStatus[]
  onSelectedStatusesChange: (statuses: DisputeCaseWorkflowStatus[]) => void
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
  status: DisputeCaseWorkflowStatus
  selectedStatuses: DisputeCaseWorkflowStatus[]
  onSelectedStatusesChange: (statuses: DisputeCaseWorkflowStatus[]) => void
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
      <TableCell className="w-[9%] min-w-24 font-medium">{formatMoney(dispute.amount)}</TableCell>
      <TableCell className="w-[11%] min-w-32">{formatDate(dispute.evidenceDueBy)}</TableCell>
      <TableCell className="w-[9%] min-w-28">{formatDate(dispute.stripeCreatedAt)}</TableCell>
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
      className="block truncate font-medium underline-offset-4 hover:underline"
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
  if (isLoading) return <Badge variant="secondary">-- shown</Badge>
  if (isError) return <Badge variant="secondary">0 shown</Badge>

  return <Badge variant="secondary">{shownCount} shown</Badge>
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

function getRequiredAction(status: DisputeCaseWorkflowStatus) {
  switch (status) {
    case 'triaged':
      return 'Start enrichment'
    case 'needs_input':
      return 'Add missing proof'
    case 'ready_for_review':
      return 'Review packet'
    case 'deadline_missed':
      return 'Review missed deadline'
    case 'ignored':
      return 'Ignored'
    case 'failed':
      return 'Fix failed run'
    default:
      return 'N/A'
  }
}

function getStripeDashboardUrl(disputeId: string) {
  return `https://dashboard.stripe.com/test/disputes/${disputeId}`
}
