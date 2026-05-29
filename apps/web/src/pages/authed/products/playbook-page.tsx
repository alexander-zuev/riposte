import {
  ChatCircleDotsIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  ScrollIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { PlaybookValidationIssue, ReadDisputePlaybookResult } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { productQueries } from '@web/entities/products/product-queries'
import { isTaggedErrorWithTag } from '@web/lib/errors'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'

const productRoute = getRouteApi('/_authed/products/$productId')

export function PlaybookPage() {
  const { product } = productRoute.useRouteContext()
  const { productId } = productRoute.useParams()
  const playbookQuery = useQuery(productQueries.playbook(productId))

  const playbook = !playbookQuery.isError && !playbookQuery.isPending ? playbookQuery.data : null
  const notFound =
    playbookQuery.isError && isTaggedErrorWithTag(playbookQuery.error, 'EntityNotFoundError')

  return (
    <div className="grid gap-8 text-foreground">
      <PageHeader
        eyebrow="Playbook"
        icon={ScrollIcon}
        title="Playbook"
        description="Evidence collection rules the agent follows when defending disputes"
        meta={playbook ? <PlaybookMeta playbook={playbook} /> : undefined}
        action={
          playbook ? (
            <Button
              variant="secondary"
              onClick={() => downloadPlaybook(product.productName, playbook)}
            >
              <DownloadSimpleIcon data-icon="inline-start" />
              Download
            </Button>
          ) : undefined
        }
      />

      <PlaybookBody
        playbook={playbook}
        isPending={playbookQuery.isPending}
        isNotFound={notFound}
        isError={playbookQuery.isError && !notFound}
        productId={productId}
        onRetry={async () => playbookQuery.refetch()}
      />
    </div>
  )
}

function PlaybookMeta({ playbook }: { playbook: ReadDisputePlaybookResult }) {
  return (
    <span className="flex items-center gap-2">
      <span>v{playbook.revision}</span>
      {playbook.validation.complete ? (
        <Badge variant="success">
          <CheckCircleIcon data-icon="inline-start" />
          Complete
        </Badge>
      ) : (
        <Badge variant="warning">
          <WarningCircleIcon data-icon="inline-start" />
          Incomplete
        </Badge>
      )}
    </span>
  )
}

function PlaybookBody({
  playbook,
  isPending,
  isNotFound,
  isError,
  productId,
  onRetry,
}: {
  playbook: ReadDisputePlaybookResult | null
  isPending: boolean
  isNotFound: boolean
  isError: boolean
  productId: string
  onRetry: () => void
}) {
  if (isPending) {
    return <div className="h-64 animate-pulse rounded-md border border-border bg-muted/30" />
  }

  if (isNotFound) {
    return (
      <div className="flex max-w-xl flex-col items-start gap-4 rounded-md border border-dashed border-border p-6">
        <p className="text-sm text-muted-foreground">
          The agent builds your playbook during onboarding by discovering your database schema,
          matching customers, and verifying evidence sources. Start or continue in chat
        </p>
        <Button render={<Link to="/products/$productId/agent" params={{ productId }} />}>
          <ChatCircleDotsIcon data-icon="inline-start" />
          Open chat
        </Button>
      </div>
    )
  }

  if (isError || !playbook) {
    return (
      <div className="flex max-w-xl flex-col items-start gap-4 rounded-md border border-destructive/30 p-6">
        <p className="text-sm text-muted-foreground">
          Something went wrong loading the playbook. Try again
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {!playbook.validation.complete ? (
        <ValidationSummary issues={playbook.validation.remaining} />
      ) : null}

      <article className="prose prose-sm max-w-none rounded-md border border-border p-6">
        <pre className="text-sm leading-relaxed whitespace-pre-wrap">{playbook.content}</pre>
      </article>
    </>
  )
}

function ValidationSummary({ issues }: { issues: PlaybookValidationIssue[] }) {
  return (
    <div className="flex max-w-xl flex-col gap-3 rounded-md border border-warning/30 bg-warning-muted/30 p-4">
      <p className="text-sm font-medium">Incomplete sections</p>
      <ul className="grid gap-1">
        {issues.map((issue) => (
          <li key={`${issue.section}-${issue.issue}`} className="flex items-center gap-2 text-sm">
            <WarningCircleIcon className="size-3.5 shrink-0 text-warning" />
            <span className="text-muted-foreground">
              {issue.section} — {formatIssue(issue.issue)}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
