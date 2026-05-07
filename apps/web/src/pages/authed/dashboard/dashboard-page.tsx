import {
  type Icon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DatabaseIcon,
  GaugeIcon,
  InfoIcon,
  ShieldCheckIcon,
  TrendUpIcon,
  WarningIcon,
} from '@phosphor-icons/react'
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
import { Progress } from '@web/ui/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@web/ui/components/ui/tooltip'

const urgentCases = [
  {
    customer: 'acme@example.com',
    amount: '$349',
    reason: 'Fraudulent',
    deadline: '4d 12h',
    state: 'ready_for_review',
    quality: 'medium',
    action: 'Review packet',
  },
  {
    customer: 'northstar@example.com',
    amount: '$99',
    reason: 'Subscription canceled',
    deadline: '8d 03h',
    state: 'needs_input',
    quality: 'low',
    action: 'Add policy proof',
  },
  {
    customer: 'atlas@example.com',
    amount: '$19',
    reason: 'Duplicate',
    deadline: '15d 18h',
    state: 'collecting_evidence',
    quality: 'high',
    action: 'Collecting facts',
  },
] as const

const setupHealthItems = [
  {
    label: 'Stripe connection',
    detail: 'Disputes, charges, invoices, customers',
    status: 'ready',
  },
  {
    label: 'App database',
    detail: 'Required for usage and delivery proof',
    status: 'needs_input',
  },
  {
    label: 'Notifications',
    detail: 'Escalations and outcome updates',
    status: 'not_configured',
  },
  {
    label: 'Evidence tools',
    detail: 'find_customer and usage tools blocked',
    status: 'blocked',
  },
] as const

const syncHealthItems = [
  { label: 'Last Stripe sync', value: '12 min ago' },
  { label: 'Webhook ingestion', value: 'Ready' },
  { label: 'Outcome reconciliation', value: 'Not run' },
  { label: 'Broken connections', value: '1' },
] as const

const agentActions = [
  {
    time: '12:42',
    label: 'Dispute received',
    detail: 'charge.dispute.created',
    tone: 'success',
  },
  {
    time: '12:42',
    label: 'Stripe facts loaded',
    detail: 'charge ch_3Qx9..., invoice in_1Pz4...',
    tone: 'success',
  },
  {
    time: '12:43',
    label: 'Evidence blocked',
    detail: 'App database not configured',
    tone: 'warning',
  },
  {
    time: '12:43',
    label: 'Founder action requested',
    detail: 'Connect Postgres',
    tone: 'warning',
  },
] as const

const evidenceQualityBadgeVariant = {
  high: 'success',
  medium: 'warning',
  low: 'secondary',
} as const

const metrics = [
  {
    label: 'Pending',
    value: '3',
    icon: ClockIcon,
    tooltip:
      'Open cases that still need handling: received, collecting evidence, needs input, or ready for review',
  },
  {
    label: 'Ready for review',
    value: '1',
    icon: CheckCircleIcon,
    tooltip: 'Generated evidence packets waiting for founder approval before Stripe submission',
  },
  {
    label: 'At risk',
    value: '$467',
    icon: WarningIcon,
    tooltip: 'Total disputed amount still unresolved before Stripe evidence deadlines',
  },
  {
    label: 'Recovered',
    value: '$0',
    icon: TrendUpIcon,
    tooltip: 'Disputed amount recovered from won cases after Stripe outcome updates',
  },
] as const

export function DashboardPage() {
  return (
    <div className="text-foreground">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <Card>
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="size-4 text-muted-foreground" />
                  Connect app database
                </CardTitle>
                <CardDescription>
                  Riposte can ingest Stripe disputes, but cannot prove product delivery until
                  Postgres access is ready
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <Badge variant="warning">Blocks autopilot</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border bg-surface p-3">
                <strong>Next required action</strong>
                <small className="mt-1 block text-muted-foreground">
                  Add a read-only Postgres connection so the runtime agent can match customers, load
                  usage activity, and generate source-backed evidence
                </small>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">
                  <DatabaseIcon data-icon="inline-start" />
                  Connect Postgres
                </Button>
                <Button variant="secondary" size="sm">
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <WarningIcon className="size-4 text-muted-foreground" />
                  Urgent cases
                </CardTitle>
                <CardDescription>
                  Stripe-facing decisions that need review, setup, or evidence before deadline
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <Button variant="secondary" size="sm">
                  Review all
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden border">
                {urgentCases.map((dispute, index) => (
                  <UrgentCaseRow key={dispute.customer} dispute={dispute} showBorder={index > 0} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GaugeIcon className="size-4 text-muted-foreground" />
                  Setup health
                </CardTitle>
                <CardDescription>
                  Product-scoped dependencies that determine whether Riposte can submit safely
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <Badge variant="warning">52% ready</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <Progress value={52} aria-label="Setup readiness score" />
              <div className="grid gap-3 md:grid-cols-2">
                {setupHealthItems.map((item) => (
                  <SetupHealthItem key={item.label} {...item} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                Autopilot settings
              </CardTitle>
              <CardDescription>
                Current mode keeps all Stripe-facing actions behind founder review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border p-3">
                <small className="text-muted-foreground">Mode</small>
                <span className="mt-1 block">Review before submit</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PolicyStat label="Auto-submit" value="Disabled" />
                <PolicyStat label="Review queue" value="1 packet" />
              </div>
              <Button variant="accent" className="w-full">
                Edit autopilot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" />
                Sync health
              </CardTitle>
              <CardDescription>
                Ingestion and reconciliation status for Stripe dispute operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {syncHealthItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 border p-3"
                >
                  <small className="text-muted-foreground">{item.label}</small>
                  <span>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="size-4 text-muted-foreground" />
                Recent agent actions
              </CardTitle>
              <CardDescription>Latest runtime decisions and blocked evidence steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agentActions.map((action) => (
                  <AgentActionRow key={`${action.time}-${action.label}`} action={action} />
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tooltip,
}: {
  label: string
  value: string
  icon: Icon
  tooltip: string
}) {
  return (
    <Card className="h-28">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </CardTitle>
        <CardAction className="static col-auto row-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`${label} metric definition`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <InfoIcon className="size-3.5" />
                </button>
              }
            />
            <TooltipContent side="top" align="end">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="mt-auto">
        <h2 className="text-system">{value}</h2>
      </CardContent>
    </Card>
  )
}

function SetupHealthItem({ label, detail, status }: (typeof setupHealthItems)[number]) {
  const statusMap = {
    ready: {
      icon: CheckCircleIcon,
      badge: 'Ready',
      variant: 'success',
    },
    needs_input: {
      icon: ClockIcon,
      badge: 'Needs input',
      variant: 'warning',
    },
    not_configured: {
      icon: WarningIcon,
      badge: 'Not configured',
      variant: 'secondary',
    },
    blocked: {
      icon: WarningIcon,
      badge: 'Blocked',
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
          <strong>{label}</strong>
          <Badge variant={config.variant}>{config.badge}</Badge>
        </div>
        <small className="mt-1 block text-muted-foreground">{detail}</small>
      </div>
    </div>
  )
}

function UrgentCaseRow({
  dispute,
  showBorder,
}: {
  dispute: (typeof urgentCases)[number]
  showBorder: boolean
}) {
  const qualityVariant = evidenceQualityBadgeVariant[dispute.quality]

  return (
    <div
      className={`grid gap-3 bg-surface p-3 sm:grid-cols-[minmax(0,1.2fr)_0.6fr_0.7fr_0.8fr_auto] sm:items-center ${
        showBorder ? 'border-t' : ''
      }`}
    >
      <div className="min-w-0">
        <strong className="block truncate">{dispute.customer}</strong>
        <small className="text-muted-foreground">{dispute.reason}</small>
      </div>
      <span className="text-system">{dispute.amount}</span>
      <small className="text-system text-muted-foreground">{dispute.deadline}</small>
      <div className="min-w-0">
        <small className="text-muted-foreground">Evidence</small>
        <div className="mt-1">
          <Badge variant={qualityVariant}>{dispute.quality}</Badge>
        </div>
      </div>
      <Badge variant="outline">{dispute.action}</Badge>
    </div>
  )
}

function PolicyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3">
      <small className="text-muted-foreground">{label}</small>
      <span className="mt-1 block text-system">{value}</span>
    </div>
  )
}

function AgentActionRow({ action }: { action: (typeof agentActions)[number] }) {
  const iconClass = {
    success: 'text-success-muted-foreground',
    warning: 'text-warning-muted-foreground',
  }[action.tone]

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3">
      <span className="text-system text-muted-foreground">{action.time}</span>
      <div className="min-w-0 border-l pl-3">
        <div className="flex items-center gap-2">
          {action.tone === 'success' ? (
            <CheckCircleIcon className={`size-4 ${iconClass}`} weight="fill" />
          ) : (
            <WarningIcon className={`size-4 ${iconClass}`} weight="fill" />
          )}
          <strong>{action.label}</strong>
        </div>
        <small className="mt-1 block text-system text-muted-foreground">{action.detail}</small>
      </div>
    </div>
  )
}
