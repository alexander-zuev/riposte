import { GithubLogoIcon } from '@phosphor-icons/react'
import Section from '@web/ui/components/layout/section'
import { PageShell } from '@web/ui/components/layout/page/page-shell'
import { Button } from '@web/ui/components/ui/button'
import { Logo } from '@web/ui/components/ui/logo'
import { useEffect } from 'react'

const CALENDLY_URL = 'https://calendly.com/alexander-zuev/30min'
const GITHUB_URL = 'https://github.com/alexander-zuev/riposte'

export function StripeDisputeEvidencePage() {
  return (
    <PageShell width="none" frame="none" header={<Header />}>
      <HeroSection />
      <ProblemSection />
      <ComparisonSection />
      <HowItWorksSection />
      <CalendlySection />
    </PageShell>
  )
}

function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container-max-w-6xl flex h-16 items-center justify-between">
        <Logo variant="full" size="sm" href="/" />
        <Button
          variant="secondary"
          size="sm"
          render={<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" />}
        >
          <GithubLogoIcon data-icon="inline-start" />
          GitHub
        </Button>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <Section noPadding className="flex items-center pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="container-max-w-5xl flex flex-col items-center text-center">
        <h1 className="text-display-hero max-w-4xl">
          AI agent that wins Stripe disputes
          <span className="text-accent"> using your app data</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Riposte connects to Stripe and your database. When a dispute arrives, it pulls real
          customer activity and submits structured evidence before the deadline.
        </p>

        <a
          href="#book"
          className="mt-8 inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
        >
          Try it on a real dispute
        </a>

        <p className="mt-6 text-system text-sm text-muted-foreground">
          Open source · Flat fee · No percentage cut
        </p>
      </div>
    </Section>
  )
}

const PAIN_POINTS = [
  {
    stat: '30-60 min',
    label: 'per dispute',
    detail: 'Pulling data from Stripe, querying your database, formatting it, writing the argument — for every single dispute',
  },
  {
    stat: '~12%',
    label: 'win rate',
    detail: 'Industry average. Most merchants submit a Stripe receipt and a paragraph of text. The bank reviewer scans it in 30 seconds',
  },
  {
    stat: '7-21 days',
    label: 'to respond',
    detail: 'One submission, no edits. Miss it and you auto-lose. Most merchants don\'t respond at all',
  },
] as const

function ProblemSection() {
  return (
    <Section background="panel">
      <div className="container-max-w-6xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent-muted-foreground uppercase">
          The problem
        </span>

        <h2 className="text-display mt-4 max-w-3xl text-center">
          Fighting disputes manually is broken
        </h2>

        <p className="mt-4 max-w-2xl text-center text-muted-foreground">
          The customer used your product for months. But when they dispute, you submit a receipt
          and hope for the best.
        </p>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point) => (
            <div key={point.stat} className="rounded-lg border border-border bg-background p-6">
              <span className="text-2xl font-bold text-destructive-muted-foreground">
                {point.stat}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">{point.label}</span>
              <p className="mt-3 text-sm text-muted-foreground">{point.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function ComparisonSection() {
  return (
    <Section>
      <div className="container-max-w-5xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent-muted-foreground uppercase">
          The solution
        </span>

        <h2 className="text-display mt-4 text-center">
          Your app has the proof. Riposte sends it to Stripe.
        </h2>

        <div className="mt-12 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-6">
            <h3 className="text-destructive-muted-foreground">What most merchants submit</h3>
            <ul className="mt-4 flex flex-col gap-2">
              {[
                'Stripe receipt (Stripe already has this)',
                'No proof the customer used the product',
                'No delivery evidence',
                '"Customer used our service" — generic text',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-destructive-muted-foreground">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6">
            <h3 className="text-success-muted-foreground">What Riposte submits</h3>
            <ul className="mt-4 flex flex-col gap-2">
              {[
                '142 sessions, 18 exports, last active 2 days ago',
                'Activity timeline with timestamps from your DB',
                'Screenshots of delivered outputs',
                'Structured to match Stripe evidence fields',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-success-muted-foreground">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <EvidencePacketMock />
      </div>
    </Section>
  )
}

function HowItWorksSection() {
  return (
    <Section id="how" background="panel">
      <div className="container-max-w-6xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent-muted-foreground uppercase">
          How it works
        </span>

        <h2 className="text-display mt-4 text-center">
          Dispute arrives. Evidence submitted. Under 60 seconds.
        </h2>

        <div className="mt-16 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard
            number="1"
            title="Dispute detected"
            description="Stripe webhook fires. Riposte identifies the customer and charge."
          >
            <DisputeDetailCard />
          </StepCard>

          <StepCard
            number="2"
            title="Evidence from your app"
            description="AI agent queries your database for sessions, usage, deliveries, support history."
          >
            <EvidenceCollectionCard />
          </StepCard>

          <StepCard
            number="3"
            title="Submitted to Stripe"
            description="PDF + evidence fields sent via API. You review first if you want."
          >
            <SubmissionCard />
          </StepCard>
        </div>
      </div>
    </Section>
  )
}

function DisputeDetailCard() {
  return (
    <div className="rounded-md border border-border bg-background text-xs">
      {/* Amount header */}
      <div className="border-b border-border px-4 pt-4 pb-3">
        <span className="text-lg font-semibold text-foreground">$199.00</span>
        <span className="ml-1 text-muted-foreground">USD</span>
        <div className="mt-2">
          <span className="inline-flex items-center rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-medium text-warning-muted-foreground">
            7 days to respond
          </span>
        </div>
      </div>

      {/* Alert */}
      <div className="border-b border-border bg-destructive-muted px-4 py-2.5">
        <span className="text-destructive-muted-foreground">
          The customer disputed this payment
        </span>
      </div>

      {/* Detail rows */}
      <div className="flex flex-col px-4 py-3">
        <DetailRow label="Reason" value="Fraudulent" />
        <DetailRow label="Network code" value="10.4" />
        <DetailRow label="Response due" value="May 17, 2026" highlight />
        <DetailRow
          label="Payment"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded-[2px] bg-[#1a1f71] px-1 py-px text-[7px] font-bold leading-none text-white uppercase">
                Visa
              </span>
              ···· 0259
            </span>
          }
        />
        <DetailRow label="Risk level" value="Normal" last />
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  highlight,
  last,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-border'}`}
    >
      <span className="text-system text-muted-foreground">{label}</span>
      <span
        className={`text-system ${highlight ? 'font-medium text-destructive-muted-foreground' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function EvidenceCollectionCard() {
  return (
    <div className="rounded-md border border-border bg-background text-xs">
      {/* Status header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-system font-medium text-accent-muted-foreground">
          collecting evidence
        </span>
      </div>

      {/* Stripe data */}
      <div className="border-b border-border px-4 py-3">
        <span className="text-system text-[10px] font-medium text-muted-foreground uppercase">
          Stripe
        </span>
        <div className="mt-2 flex flex-col">
          <DataRow label="Customer since" value="4 months" />
          <DataRow label="Total paid" value="$597" last />
        </div>
      </div>

      {/* App database */}
      <div className="px-4 py-3">
        <span className="text-system text-[10px] font-medium text-muted-foreground uppercase">
          Your database
        </span>
        <div className="mt-2 flex flex-col">
          <DataRow label="Sessions" value="142" />
          <DataRow label="Exports" value="18" />
          <DataRow label="Last active" value="2 days ago" />
          <DataRow label="Support tickets" value="0" last />
        </div>
      </div>
    </div>
  )
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-border'}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-system font-medium">{value}</span>
    </div>
  )
}

function SubmissionCard() {
  const items = [
    'Service documentation PDF',
    'Activity timeline',
    'Usage screenshots',
    'Written argument',
    'Stripe receipt',
  ]

  return (
    <div className="rounded-md border border-border bg-background text-xs">
      {/* Status header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="text-system font-medium text-success-muted-foreground">submitted</span>
      </div>

      {/* Evidence checklist */}
      <div className="flex flex-col px-4 py-3">
        {items.map((item, i) => (
          <div
            key={item}
            className={`flex items-center justify-between py-1.5 ${i < items.length - 1 ? 'border-b border-border' : ''}`}
          >
            <span className="text-muted-foreground">{item}</span>
            <span className="text-success-muted-foreground">✓</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
          {number}
        </div>
        <h3>{title}</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

function EvidencePacketMock() {
  return (
    <div className="mt-12 w-full max-w-3xl self-center overflow-hidden rounded-xl border border-border shadow-lg">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">evidence_dp_1R2x.pdf</span>
      </div>

      {/* Evidence content */}
      <div className="bg-background p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <span className="text-system text-xs text-accent-muted-foreground">
              Riposte evidence packet
            </span>
            <h3 className="mt-1">Service documentation</h3>
          </div>
          <span className="text-system text-xs text-muted-foreground">dp_1R2xK4...mN8</span>
        </div>

        {/* Customer + usage */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h6 className="mb-2">Customer</h6>
            <div className="flex flex-col gap-1">
              <InfoRow label="Email" value="alex@example.com" />
              <InfoRow label="IP at signup" value="73.162.xx.xx" />
              <InfoRow label="Account created" value="2026-01-12" />
              <InfoRow label="Plan" value="Pro monthly" />
              <InfoRow label="Total paid" value="$597.00" />
            </div>
          </div>
          <div>
            <h6 className="mb-2">Usage summary</h6>
            <div className="flex flex-col gap-1 text-xs leading-5 text-muted-foreground">
              <span>
                Customer created an account on Jan 12, 2026 and actively used the service for
                4 months. Over this period, the customer logged 142 sessions, created 18
                exports, and generated 6 reports.
              </span>
              <span>
                Last recorded activity was Apr 26 — 2 days before filing the dispute.
                No support tickets were opened. No refund was requested prior to dispute.
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-5 border-t border-border pt-5">
          <h6 className="mb-3">Activity timeline</h6>
          <div className="flex flex-col gap-1.5">
            {[
              ['Jan 12', 'Account created, Pro plan activated', 'stripe'],
              ['Jan–Apr', '142 sessions, 18 exports, 6 reports', 'app_db'],
              ['Apr 26', 'Last login — 2 days before dispute', 'app_db'],
              ['Apr 28', 'Dispute filed — reason: fraudulent', 'stripe'],
            ].map(([date, event, source]) => (
              <div key={event} className="grid grid-cols-[5rem_1fr] gap-3 text-xs">
                <span className="text-system font-medium">{date}</span>
                <span>
                  {event}
                  <span className="ml-2 text-muted-foreground">{source}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivered outputs */}
        <div className="mt-5 border-t border-border pt-5">
          <h6 className="mb-3">Delivered outputs</h6>
          <div className="grid grid-cols-3 gap-2">
            {/* Mini chart */}
            <div>
              <div className="flex aspect-[4/3] flex-col justify-between rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Sessions</span>
                <div className="flex items-end gap-[3px]">
                  {Object.entries([3, 5, 4, 7, 6, 8, 5, 9, 7, 10, 8, 12]).map(([key, h]) => (
                    <div
                      key={key}
                      className="flex-1 rounded-[1px] bg-accent"
                      style={{ height: `${h * 3}px` }}
                    />
                  ))}
                </div>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">Report #14</span>
            </div>

            {/* Mini data table */}
            <div>
              <div className="flex aspect-[4/3] flex-col rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Export</span>
                <div className="mt-1 flex flex-col gap-[3px]">
                  {[65, 80, 45, 90, 55].map((w, i) => (
                    <div key={`row-${w}`} className="flex gap-1">
                      <div className="h-[5px] w-[20%] rounded-[1px] bg-border" />
                      <div
                        className="h-[5px] rounded-[1px] bg-accent/40"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">Export #18</span>
            </div>

            {/* Mini dashboard */}
            <div>
              <div className="flex aspect-[4/3] flex-col rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Dashboard</span>
                <div className="mt-1 grid grid-cols-2 gap-1 flex-1">
                  <div className="rounded-[2px] bg-accent/20" />
                  <div className="rounded-[2px] bg-info/20" />
                  <div className="col-span-2 rounded-[2px] bg-border/50" />
                </div>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">Dashboard</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Evidence prepared Apr 28, 2026 · Sources: Stripe API, merchant database</span>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

function CalendlySection() {
  return (
    <Section id="book">
      <div className="container-max-w-4xl flex flex-col items-center">
        <h2 className="text-display text-center">
          Get started with your first dispute
        </h2>

        <p className="mt-4 max-w-xl text-center text-muted-foreground">
          We'll set up Riposte on a real dispute together
        </p>

        <div className="mt-8 w-full">
          <CalendlyEmbed />
        </div>
      </div>
    </Section>
  )
}

function CalendlyEmbed() {
  useEffect(() => {
    if (document.querySelector('script[src*="assets.calendly.com"]')) return

    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  return (
    <div
      className="calendly-inline-widget w-full"
      data-url={CALENDLY_URL}
      style={{ minWidth: '320px', height: '700px' }}
    />
  )
}
