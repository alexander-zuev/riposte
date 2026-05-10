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
          render={<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />}
        >
          <GithubLogoIcon data-icon="inline-start" />
          Source
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
        <span className="inline-flex items-center text-system text-xs font-medium text-accent uppercase">
          The problem
        </span>

        <h2 className="text-display mt-4 max-w-3xl text-center">
          Your app has the proof. It never reaches Stripe.
        </h2>

        <p className="mt-4 max-w-2xl text-center text-muted-foreground">
          The customer used your product for months — sessions, exports, generated content. But
          when they dispute, you submit a receipt and hope for the best.
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
        <span className="inline-flex items-center text-system text-xs font-medium text-accent uppercase">
          The difference
        </span>

        <h2 className="text-display mt-4 text-center">
          Receipt vs. real evidence
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
      </div>
    </Section>
  )
}

function HowItWorksSection() {
  return (
    <Section id="how" background="panel">
      <div className="container-max-w-6xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent uppercase">
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
            <div className="rounded-md border border-border bg-background p-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <span className="font-medium text-warning-muted-foreground">dispute.created</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-muted-foreground">
                <div>
                  <span className="text-foreground">amount:</span>{' '}
                  <span className="text-destructive-muted-foreground">$199.00</span>
                </div>
                <div>
                  <span className="text-foreground">reason:</span> fraudulent
                </div>
                <div>
                  <span className="text-foreground">deadline:</span>{' '}
                  <span className="text-destructive-muted-foreground">7 days</span>
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard
            number="2"
            title="Evidence from your app"
            description="AI agent queries your database for sessions, usage, deliveries, support history."
          >
            <div className="rounded-md border border-border bg-background p-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="font-medium text-accent-muted-foreground">
                  collecting evidence
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                <div>
                  <div className="text-muted-foreground">stripe</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <Row label="Customer since" value="4 months" />
                    <Row label="Total paid" value="$597" />
                  </div>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="text-muted-foreground">your database</div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <Row label="Sessions" value="142" />
                    <Row label="Exports" value="18" />
                    <Row label="Last active" value="2 days ago" />
                    <Row label="Support tickets" value="0" />
                  </div>
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard
            number="3"
            title="Submitted to Stripe"
            description="PDF + evidence fields sent via API. You review first if you want."
          >
            <div className="rounded-md border border-border bg-background p-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="font-medium text-success-muted-foreground">submitted</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-muted-foreground">
                <Row label="Service documentation PDF" value="" check />
                <Row label="Activity timeline" value="" check />
                <Row label="Usage screenshots" value="" check />
                <Row label="Written argument" value="" check />
                <Row label="Stripe receipt" value="" check />
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </Section>
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

function Row({
  label,
  value,
  check,
}: {
  label: string
  value: string
  check?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-success-muted-foreground">{check ? '✓' : `✓ ${value}`}</span>
    </div>
  )
}

function CalendlySection() {
  return (
    <Section id="book">
      <div className="container-max-w-4xl flex flex-col items-center">
        <h2 className="text-display text-center">
          Send me a dispute. I'll show you the evidence packet.
        </h2>

        <p className="mt-4 max-w-xl text-center text-muted-foreground">
          Pick a recent Stripe dispute. I'll run Riposte against your data and walk you through
          what it builds — the activity timeline, the PDF, the Stripe fields. 30 minutes, no
          strings attached.
        </p>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          — Alexander,{' '}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline"
          >
            creator of Riposte
          </a>
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
