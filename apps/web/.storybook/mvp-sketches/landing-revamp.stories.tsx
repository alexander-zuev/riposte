import {
  BellIcon,
  BrainIcon,
  BroadcastIcon,
  CloudIcon,
  CurrencyDollarIcon,
  DatabaseIcon,
  EyeIcon,
  GithubLogoIcon,
  LightningIcon,
  ShieldCheckIcon,
  StripeLogoIcon,
} from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Section from '@web/ui/components/layout/section'
import { Badge } from '@web/ui/components/ui/badge'

const meta: Meta = {
  title: 'MVP Sketches/Landing Revamp',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

/* =============================================================================
 * 1. HERO — Tighter subtitle, stronger badges
 * ============================================================================= */

export const Hero: Story = {
  render: () => (
    <Section noPadding className="flex items-center pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="container-max-w-5xl flex flex-col items-center text-center">
        <h1 className="text-display-hero max-w-4xl">
          AI agent that wins Stripe disputes
          <span className="text-accent"> using your app data</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Riposte connects to your database, pulls the usage proof bank reviewers need, and submits
          a complete evidence packet to Stripe — before the deadline runs out
        </p>

        <a
          href="#book"
          className="mt-8 inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
        >
          Try it on a real dispute
        </a>

        <div className="mt-6 flex items-center gap-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <LightningIcon className="size-4" />
            Installs in minutes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CurrencyDollarIcon className="size-4" />
            Flat fee, no revenue cut
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GithubLogoIcon className="size-4" />
            Open source
          </span>
        </div>
      </div>
    </Section>
  ),
}

/* =============================================================================
 * 2. HOW IT WORKS — 6-step flow showing intelligence + HITL
 * ============================================================================= */

const FLOW_STEPS = [
  {
    number: '1',
    icon: BroadcastIcon,
    title: 'Dispute arrives',
    description: 'Stripe webhook fires. Riposte ingests the dispute, charge, and customer context.',
    color: 'text-foreground' as const,
    dotColor: 'bg-foreground' as const,
  },
  {
    number: '2',
    icon: ShieldCheckIcon,
    title: 'Intelligent triage',
    description:
      'Deterministic rules check reason codes and network overrides. Non-contestable disputes are skipped. Edge cases escalate to you.',
    color: 'text-info-muted-foreground' as const,
    dotColor: 'bg-info' as const,
    badge: 'Auto or HITL',
  },
  {
    number: '3',
    icon: StripeLogoIcon,
    title: 'Stripe enrichment',
    description:
      'Payment history, refund state, 3DS, AVS/CVC checks, prior charges, and receipt/invoice context — all pulled from Stripe.',
    color: 'text-foreground' as const,
    dotColor: 'bg-foreground' as const,
  },
  {
    number: '4',
    icon: BrainIcon,
    title: 'AI collects your app evidence',
    description:
      'The agent queries your database for sessions, exports, deliveries, support tickets, and activity timelines. Every fact is source-referenced.',
    color: 'text-accent-muted-foreground' as const,
    dotColor: 'bg-accent' as const,
    badge: 'AI agent',
  },
  {
    number: '5',
    icon: EyeIcon,
    title: 'Submit or review',
    description:
      'High-quality packets auto-submit. Medium or low quality? You review first. You can always approve, edit, or accept the loss.',
    color: 'text-warning-muted-foreground' as const,
    dotColor: 'bg-warning' as const,
    badge: 'Your call',
  },
  {
    number: '6',
    icon: BellIcon,
    title: 'Merchant notified',
    description:
      'Every action — submitted, needs input, won, lost, deadline approaching — sends a notification. No silent failures.',
    color: 'text-success-muted-foreground' as const,
    dotColor: 'bg-success' as const,
  },
] as const

export const HowItWorks: Story = {
  render: () => (
    <Section background="panel">
      <div className="container-max-w-5xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent-muted-foreground uppercase">
          How it works
        </span>

        <h2 className="text-display mt-4 max-w-3xl text-center">
          Dispute arrives. Evidence submitted. You stay in control.
        </h2>

        <p className="mt-4 max-w-2xl text-center text-muted-foreground">
          Six stages from webhook to win. AI handles the evidence grind — deterministic rules handle
          triage, validation, and submission policy.
        </p>

        {/* Flow timeline */}
        <div className="mt-16 w-full max-w-3xl">
          <div className="flex flex-col">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.number} className="flex gap-6">
                {/* Timeline spine */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background`}
                  >
                    <step.icon className={`size-5 ${step.color}`} />
                  </div>
                  {i < FLOW_STEPS.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>

                {/* Content */}
                <div className={`pb-10 ${i === FLOW_STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <h5>{step.title}</h5>
                    {step.badge && <Badge variant="secondary">{step.badge}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual anchors — reuse the 3 mock cards from current landing */}
        <div className="mt-16 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {/* Step 1 mock card */}
          <div className="rounded-md border border-border bg-background text-xs">
            <div className="border-b border-border px-4 pt-4 pb-3">
              <span className="text-lg font-semibold text-foreground">$199.00</span>
              <span className="ml-1 text-muted-foreground">USD</span>
              <div className="mt-2">
                <Badge variant="warning">7 days to respond</Badge>
              </div>
            </div>
            <div className="flex flex-col px-4 py-3">
              <MiniRow label="Reason" value="Fraudulent" />
              <MiniRow label="Network code" value="10.4" />
              <MiniRow label="Payment" value="Visa ···· 0259" last />
            </div>
          </div>

          {/* Step 4 mock card */}
          <div className="rounded-md border border-border bg-background text-xs">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-system font-medium text-accent-muted-foreground">
                collecting evidence
              </span>
            </div>
            <div className="border-b border-border px-4 py-3">
              <span className="text-system text-[10px] font-medium text-muted-foreground uppercase">
                Stripe
              </span>
              <div className="mt-2 flex flex-col">
                <MiniRow label="Customer since" value="4 months" />
                <MiniRow label="Total paid" value="$597" last />
              </div>
            </div>
            <div className="px-4 py-3">
              <span className="text-system text-[10px] font-medium text-muted-foreground uppercase">
                Your app
              </span>
              <div className="mt-2 flex flex-col">
                <MiniRow label="Sessions" value="142" />
                <MiniRow label="Exports" value="18" />
                <MiniRow label="Last active" value="2 days ago" last />
              </div>
            </div>
          </div>

          {/* Step 5 mock card */}
          <div className="rounded-md border border-border bg-background text-xs">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-system font-medium text-success-muted-foreground">
                submitted
              </span>
            </div>
            <div className="flex flex-col px-4 py-3">
              {[
                'Service documentation PDF',
                'Activity timeline',
                'Usage proof',
                'Written argument',
                'Stripe receipt',
              ].map((item, i, arr) => (
                <div
                  key={item}
                  className={`flex items-center justify-between py-1.5 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="text-muted-foreground">{item}</span>
                  <span className="text-success-muted-foreground">&#10003;</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  ),
}

/* =============================================================================
 * 3. WHY RIPOSTE — 3 differentiators grid
 * ============================================================================= */

const DIFFERENTIATORS = [
  {
    icon: DatabaseIcon,
    title: 'Your app data as evidence',
    description:
      'Most merchants submit a Stripe receipt and a sentence. Riposte queries your database for sessions, exports, activity timelines, and delivered outputs — the proof bank reviewers actually look at.',
    items: [
      '142 sessions, 18 exports, last active 2 days ago',
      'Activity timeline with timestamps from your app',
      'Delivered outputs and screenshots',
      'Structured to match Stripe evidence fields',
    ],
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Flat fee, no revenue cut',
    description:
      'Chargeback services take 15-25% of recovered revenue. Riposte charges a flat fee per dispute — whether you recover $50 or $5,000.',
    items: [
      'Pay per dispute, not per dollar recovered',
      'No percentage of recovered amount',
      'No monthly minimums',
      'Know your cost before you submit',
    ],
  },
  {
    icon: CloudIcon,
    title: 'Self-host or use cloud',
    description:
      'Deploy to your own Cloudflare account. Your data never leaves your infrastructure. Or use the hosted version — same agent, zero ops.',
    items: [
      'Open source (AGPLv3) — audit every line',
      'One-click deploy to Cloudflare Workers',
      'Your Stripe keys stay on your infra',
      'Hosted option with zero setup',
    ],
  },
] as const

export const WhyRiposte: Story = {
  render: () => (
    <Section>
      <div className="container-max-w-6xl flex flex-col items-center">
        <span className="inline-flex items-center text-system text-xs font-medium text-accent-muted-foreground uppercase">
          Why Riposte
        </span>

        <h2 className="text-display mt-4 text-center">
          Your app has the proof. Riposte sends it to Stripe.
        </h2>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {DIFFERENTIATORS.map((diff) => (
            <div
              key={diff.title}
              className="flex flex-col rounded-lg border border-border bg-surface p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                  <diff.icon className="size-5 text-accent-muted-foreground" />
                </div>
                <h5>{diff.title}</h5>
              </div>

              <p className="text-sm text-muted-foreground">{diff.description}</p>

              <ul className="mt-4 flex flex-col gap-2">
                {diff.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 text-success-muted-foreground">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Section>
  ),
}

/* =============================================================================
 * ALL 3 — Full page preview
 * ============================================================================= */

export const AllSections: Story = {
  render: () => (
    <div>
      {Hero.render?.({} as never, {} as never)}
      {WhyRiposte.render?.({} as never, {} as never)}
      {HowItWorks.render?.({} as never, {} as never)}
    </div>
  ),
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

function MiniRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${last ? '' : 'border-b border-border'}`}
    >
      <span className="text-system text-muted-foreground">{label}</span>
      <span className="text-system font-medium">{value}</span>
    </div>
  )
}
