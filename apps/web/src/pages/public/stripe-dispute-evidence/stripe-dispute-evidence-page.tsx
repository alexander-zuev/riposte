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
      <HowItWorksSection />
      <WhatYouGetSection />
      <FounderSection />
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
          customer activity — sessions, usage, deliveries — and submits structured evidence to
          Stripe before the deadline.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#book"
            className="inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
          >
            Book a call — bring a dispute
          </a>
          <a
            href="#how"
            className="inline-flex items-center rounded-md border border-border px-6 py-3 font-medium text-foreground no-underline transition-colors hover:bg-surface-hover hover:no-underline"
          >
            See how it works
          </a>
        </div>

        <p className="mt-8 text-system text-sm text-muted-foreground">
          Open source · Flat fee · No percentage cut
        </p>
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
            title="Evidence pulled from your app"
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
                    <Row label="Exports created" value="18" />
                    <Row label="Last active" value="2 days ago" />
                    <Row label="Support tickets" value="0" />
                  </div>
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard
            number="3"
            title="Structured packet submitted"
            description="PDF + Stripe evidence fields sent via API. You review first if you want."
          >
            <div className="rounded-md border border-border bg-background p-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="font-medium text-success-muted-foreground">submitted</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Service documentation PDF</span>
                  <span className="text-success-muted-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Activity timeline</span>
                  <span className="text-success-muted-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Usage screenshots</span>
                  <span className="text-success-muted-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Written argument</span>
                  <span className="text-success-muted-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Stripe receipt</span>
                  <span className="text-success-muted-foreground">✓</span>
                </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-success-muted-foreground">✓ {value}</span>
    </div>
  )
}

function WhatYouGetSection() {
  return (
    <Section>
      <div className="container-max-w-5xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent uppercase">
          Why this works
        </span>

        <h2 className="text-display mt-4 text-center">
          Stripe sees the payment. Your app has the proof.
        </h2>

        <p className="mt-4 max-w-2xl text-center text-muted-foreground">
          Most merchants lose disputes because they only submit what Stripe already knows — a
          receipt. Riposte pulls proof from your product: who logged in, what they did, what they
          received.
        </p>

        <div className="mt-12 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <ComparisonCard
            variant="without"
            title="Without Riposte"
            items={[
              'Stripe receipt (Stripe already has this)',
              'No usage proof',
              'No delivery proof',
              'Generic "customer used our service" text',
              'Average win rate: ~20%',
            ]}
          />
          <ComparisonCard
            variant="with"
            title="With Riposte"
            items={[
              '142 sessions, 18 exports, last active 2 days ago',
              'Full activity timeline with timestamps',
              'Screenshots of delivered outputs',
              'Customer-specific evidence from your database',
              'Structured to match Stripe evidence fields',
            ]}
          />
        </div>
      </div>
    </Section>
  )
}

function ComparisonCard({
  variant,
  title,
  items,
}: {
  variant: 'without' | 'with'
  title: string
  items: string[]
}) {
  const isWith = variant === 'with'
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h3
        className={
          isWith ? 'text-success-muted-foreground' : 'text-destructive-muted-foreground'
        }
      >
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className={isWith ? 'text-success-muted-foreground' : 'text-destructive-muted-foreground'}>
              {isWith ? '✓' : '✗'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FounderSection() {
  return (
    <Section background="panel">
      <div className="container-max-w-4xl flex flex-col items-center text-center">
        <p className="text-foreground">
          I built Riposte because I watched SaaS founders lose disputes they should win. Not
          because the customer was right — but because the evidence never left the database. The
          tools that exist charge 25-30% of recovered money. Riposte is open source with a flat
          fee.
        </p>

        <p className="mt-4 text-muted-foreground">
          I'm looking for 3-5 merchants with real Stripe disputes to build this with. You bring
          the dispute, I bring the agent. If Riposte can't build a better packet than what you'd
          submit manually, you'll know in 30 minutes.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">— Alexander, creator of Riposte</p>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface-hover hover:no-underline"
        >
          <GithubLogoIcon className="h-4 w-4" />
          View source on GitHub
        </a>
      </div>
    </Section>
  )
}

function CalendlySection() {
  return (
    <Section id="book">
      <div className="container-max-w-4xl flex flex-col items-center">
        <h2 className="text-display text-center">Book a 30-minute call</h2>

        <p className="mt-4 text-center text-muted-foreground">
          Bring one recent Stripe dispute. We'll look at whether Riposte can build the evidence
          packet from your actual data sources.
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
