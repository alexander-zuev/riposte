import {
  ArrowClockwiseIcon,
  ChatCircleDotsIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  ScrollIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type {
  PlaybookValidationIssue,
  ReadDisputePlaybookResult,
  ReadProductDisputeSetupResult,
} from '@riposte/core/client'
import { Link } from '@tanstack/react-router'
import { CompletenessBadge, IncompleteList } from '@web/features/products/completeness'
import { ProductFactsSection } from '@web/features/products/product-facts-section'
import { formatInTimeZone } from '@web/lib/datetime'
import { useTimezone } from '@web/lib/hooks/use-timezone'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { StatusNote } from '@web/ui/components/layout/status-note'
import { Button } from '@web/ui/components/ui/button'
import { Card, CardContent } from '@web/ui/components/ui/card'
import { GridLoader } from '@web/ui/components/ui/grid-loader'
import { Markdown } from '@web/ui/components/ui/markdown'
import type { ReactNode } from 'react'

/**
 * Pure presentation for the playbook page, rendered with guaranteed data. The route blocks on
 * `ensureQueryData` and the page reads it with `useSuspenseQuery`, so loading and error never reach
 * this component: the route's `pendingComponent` (`PlaybookPending`) and `errorComponent`
 * (`PlaybookErrorState`) own those states. Kept free of server/route imports for Storybook.
 */
export function PlaybookView({
  data,
  productId,
  productName,
}: {
  data: ReadProductDisputeSetupResult
  productId: string
  productName: string
}) {
  return (
    <PlaybookLayout>
      <PlaybookSection playbook={data.playbook} productId={productId} productName={productName} />
      <ProductFactsSection productFacts={data.productFacts} />
    </PlaybookLayout>
  )
}

/** Route `pendingComponent`: shown while the loader resolves on navigation. */
export function PlaybookPending() {
  return (
    <PlaybookLayout>
      <StatusNote icon={<GridLoader />}>Loading playbook</StatusNote>
    </PlaybookLayout>
  )
}

/** Route `errorComponent`: shown when the loader (or a client refetch) fails. `onRetry` is the route reset. */
export function PlaybookErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <PlaybookLayout>
      <StatusNote
        icon={<WarningCircleIcon className="size-5" />}
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <ArrowClockwiseIcon data-icon="inline-start" />
            Try again
          </Button>
        }
      >
        Could not load the playbook
      </StatusNote>
    </PlaybookLayout>
  )
}

function PlaybookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 text-foreground">
      <PageHeader
        eyebrow="Playbook"
        icon={ScrollIcon}
        title="Playbook"
        description="The playbook the agent follows and the product facts it sends to Stripe when defending disputes"
      />
      {children}
    </div>
  )
}

function PlaybookSection({
  playbook,
  productId,
  productName,
}: {
  playbook: ReadDisputePlaybookResult | null
  productId: string
  productName: string
}) {
  const timeZone = useTimezone()

  return (
    <section className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3>Dispute playbook</h3>
          <p className="text-muted-foreground">
            The rules the agent follows to collect evidence for each dispute
          </p>
        </div>
        <CompletenessBadge complete={playbook?.validation.complete ?? false} />
      </div>

      {playbook && !playbook.validation.complete ? (
        <IncompleteList
          title="Incomplete sections"
          items={playbook.validation.remaining.map(
            (issue) => `${issue.section}: ${formatIssue(issue.issue)}`,
          )}
        />
      ) : null}

      {playbook === null ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ScrollIcon className="size-6 text-muted-foreground" />
            <p>No playbook yet</p>
            <small className="max-w-md text-muted-foreground">
              The agent builds your playbook during onboarding by discovering your database schema,
              matching customers, and verifying evidence sources
            </small>
            <Button
              variant="secondary"
              size="sm"
              render={<Link to="/products/$productId/agent" params={{ productId }} />}
            >
              <ChatCircleDotsIcon data-icon="inline-start" />
              Open chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <small className="font-medium">PLAYBOOK.md</small>
              <small className="truncate text-muted-foreground">
                v{playbook.revision} · Created{' '}
                {formatInTimeZone(playbook.createdAt, timeZone, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </small>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadPlaybook(productName, playbook)}
            >
              <DownloadSimpleIcon data-icon="inline-start" />
              Download .md
            </Button>
          </div>

          <Card>
            <CardContent>
              <Markdown>{playbook.content}</Markdown>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}

function formatIssue(issue: PlaybookValidationIssue['issue']): string {
  switch (issue) {
    case 'missing':
      return 'section missing'
    case 'too_short':
      return 'content too short'
    case 'no_source':
      return 'missing Source line'
    default: {
      const exhaustive: never = issue
      return exhaustive
    }
  }
}

function downloadPlaybook(productName: string, playbook: ReadDisputePlaybookResult) {
  const filename = `${productName.toLowerCase().replace(/\s+/g, '-')}-playbook-v${playbook.revision}.md`
  const blob = new Blob([playbook.content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
