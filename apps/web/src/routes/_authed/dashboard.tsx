import {
  ArrowRight,
  Bank,
  BellRinging,
  CheckCircle,
  Clock,
  Database,
  FilePdf,
  Gauge,
  Lightning,
  PlugsConnected,
  ShieldCheck,
  StripeLogo,
  Warning,
} from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { LogoIcon } from '@web/ui/components/ui/logo'
import { Progress } from '@web/ui/components/ui/progress'
import { Separator } from '@web/ui/components/ui/separator'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

const readinessItems = [
  {
    label: 'Stripe account connected',
    detail: 'Disputes, charges, invoices, customers',
    status: 'ready',
  },
  {
    label: 'Read-only database access',
    detail: 'User activity, sessions, feature usage',
    status: 'next',
  },
  {
    label: 'Refund and cancellation policies',
    detail: 'Static files and checkout disclosures',
    status: 'missing',
  },
  {
    label: 'Evidence screenshots',
    detail: 'Checkout terms, product access, generated output',
    status: 'missing',
  },
] as const

const pipelineSteps = [
  {
    label: 'Webhook received',
    value: 'charge.dispute.created',
    icon: BellRinging,
    tone: 'success',
  },
  {
    label: 'Payment facts loaded',
    value: 'Charge, customer, invoice PDF',
    icon: StripeLogo,
    tone: 'success',
  },
  {
    label: 'Usage evidence query',
    value: 'Waiting for database connector',
    icon: Database,
    tone: 'warning',
  },
  {
    label: 'Evidence PDF',
    value: 'Timeline, activity table, screenshots',
    icon: FilePdf,
    tone: 'neutral',
  },
] as const

const disputes = [
  {
    customer: 'acme@example.com',
    amount: '$349',
    reason: 'Fraudulent',
    due: '4d 12h',
    confidence: 84,
    status: 'Ready to contest',
  },
  {
    customer: 'northstar@example.com',
    amount: '$99',
    reason: 'Subscription canceled',
    due: '8d 03h',
    confidence: 61,
    status: 'Needs policy proof',
  },
  {
    customer: 'atlas@example.com',
    amount: '$19',
    reason: 'Duplicate',
    due: '15d 18h',
    confidence: 96,
    status: 'Auto-refund candidate',
  },
] as const

function DashboardPage() {
  const { session } = Route.useRouteContext()
  const firstName = session.user.name?.split(' ')[0] ?? session.user.email

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoIcon variant="app" size={36} />
            <div>
              <p className="text-sm font-medium">Riposte Command</p>
              <p className="text-xs text-muted-foreground">Logged in as {firstName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <PlugsConnected data-icon="inline-start" />
              Connect source
            </Button>
            <Button size="sm">
              <Lightning data-icon="inline-start" />
              Arm autopilot
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Open disputes" value="3" detail="$467 at risk" tone="warning" />
            <MetricCard
              label="Evidence ready"
              value="1"
              detail="2 blocked by setup"
              tone="success"
            />
            <MetricCard label="Median response" value="58s" detail="Target under 60s" tone="info" />
            <MetricCard
              label="Recovered"
              value="$0"
              detail="Starts after first win"
              tone="neutral"
            />
          </div>

          <Card className="bg-background">
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="size-4 text-accent-muted-foreground" />
                  Dispute Readiness
                </CardTitle>
                <CardDescription>
                  The agent can submit Stripe evidence now, but app-specific proof needs two setup
                  steps.
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <Badge variant="warning">52% ready</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <Progress value={52} aria-label="Dispute readiness score" />
              <div className="grid gap-3 md:grid-cols-2">
                {readinessItems.map((item) => (
                  <ReadinessItem key={item.label} {...item} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Evidence Pipeline</CardTitle>
              <CardDescription>
                Every dispute moves through the same deterministic path before AI writes the final
                argument fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {pipelineSteps.map((step, index) => (
                  <PipelineStep key={step.label} index={index + 1} {...step} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle>Dispute Queue</CardTitle>
                <CardDescription>
                  This is the worklist the autopilot will drain once sources and policy are
                  complete.
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <Button variant="secondary" size="sm">
                  Review all
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden border">
                {disputes.map((dispute, index) => (
                  <DisputeRow key={dispute.customer} dispute={dispute} showBorder={index > 0} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Contest Policy
              </CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Current mode balances fee risk against likely recovery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-primary-foreground/20 p-3">
                <p className="text-xs text-primary-foreground/70">Mode</p>
                <p className="mt-1 text-sm font-medium">Contest if confidence is 70%+</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PolicyStat label="Counter fee" value="$15" />
                <PolicyStat label="Manual review" value="2 cases" />
              </div>
              <Button variant="accent" className="w-full">
                Tune policy
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Next Connector</CardTitle>
              <CardDescription>
                Riposte needs a read-only path into your product database to prove delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConnectorOption
                icon={Database}
                label="Postgres"
                detail="Recommended for SaaS usage logs"
                active
              />
              <ConnectorOption
                icon={Bank}
                label="Stripe OAuth"
                detail="Payment data and dispute submission"
              />
              <ConnectorOption
                icon={FilePdf}
                label="Policy vault"
                detail="Refund, cancellation, terms screenshots"
              />
            </CardContent>
          </Card>

          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Case Builder</CardTitle>
              <CardDescription>Fields the agent will generate for each contest.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Usage timeline', 'Customer access log', 'Service documentation PDF'].map(
                (label) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="size-4 text-success-muted-foreground" weight="fill" />
                    <span>{label}</span>
                  </div>
                ),
              )}
              <Separator />
              {['Cancellation rebuttal', 'Refund refusal explanation', 'Uncategorized text'].map(
                (label) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <Warning className="size-4 text-warning-muted-foreground" weight="fill" />
                    <span>{label}</span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: 'success' | 'warning' | 'info' | 'neutral'
}) {
  const toneClass = {
    success: 'text-success-muted-foreground',
    warning: 'text-warning-muted-foreground',
    info: 'text-info-muted-foreground',
    neutral: 'text-muted-foreground',
  }[tone]

  return (
    <Card size="sm" className="bg-background">
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-normal">{value}</p>
        <p className={toneClass}>{detail}</p>
      </CardContent>
    </Card>
  )
}

function ReadinessItem({ label, detail, status }: (typeof readinessItems)[number]) {
  const statusMap = {
    ready: {
      icon: CheckCircle,
      badge: 'Ready',
      variant: 'success',
    },
    next: {
      icon: Clock,
      badge: 'Next',
      variant: 'warning',
    },
    missing: {
      icon: Warning,
      badge: 'Missing',
      variant: 'secondary',
    },
  } as const
  const config = statusMap[status]
  const Icon = config.icon

  return (
    <div className="flex min-h-20 items-start gap-3 border bg-surface p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" weight="fill" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{label}</p>
          <Badge variant={config.variant}>{config.badge}</Badge>
        </div>
        <p className="mt-1 text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function PipelineStep({
  index,
  label,
  value,
  icon: Icon,
  tone,
}: (typeof pipelineSteps)[number] & { index: number }) {
  const toneClass = {
    success: 'bg-success-muted text-success-muted-foreground',
    warning: 'bg-warning-muted text-warning-muted-foreground',
    neutral: 'bg-muted text-muted-foreground',
  }[tone]

  return (
    <div className="min-h-32 border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">0{index}</span>
        <span className={`grid size-7 place-items-center ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-5 font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  )
}

function DisputeRow({
  dispute,
  showBorder,
}: {
  dispute: (typeof disputes)[number]
  showBorder: boolean
}) {
  const badgeVariant = dispute.confidence >= 70 ? 'success' : 'warning'

  return (
    <div
      className={`grid gap-3 bg-surface p-3 sm:grid-cols-[minmax(0,1.2fr)_0.7fr_0.7fr_0.9fr_auto] sm:items-center ${
        showBorder ? 'border-t' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{dispute.customer}</p>
        <p className="text-muted-foreground">{dispute.reason}</p>
      </div>
      <p className="font-medium tabular-nums">{dispute.amount}</p>
      <p className="text-muted-foreground">{dispute.due}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Confidence</span>
          <span className="tabular-nums">{dispute.confidence}%</span>
        </div>
        <Progress value={dispute.confidence} aria-label={`${dispute.customer} confidence`} />
      </div>
      <Badge variant={badgeVariant}>{dispute.status}</Badge>
    </div>
  )
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-primary-foreground/20 p-3">
      <p className="text-xs text-primary-foreground/70">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function ConnectorOption({
  icon: Icon,
  label,
  detail,
  active,
}: {
  icon: typeof Database
  label: string
  detail: string
  active?: boolean
}) {
  return (
    <div className="flex items-start gap-3 border bg-surface p-3">
      <span className="grid size-8 shrink-0 place-items-center bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{label}</p>
          {active && <Badge variant="accent">Next</Badge>}
        </div>
        <p className="mt-1 text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
