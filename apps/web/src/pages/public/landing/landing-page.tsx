import { CheckIcon, CurrencyDollarIcon, GithubLogoIcon } from '@phosphor-icons/react'
import { unwrapRpc } from '@riposte/core/client'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import {
  type JoinWaitlistInput,
  joinWaitlist,
  joinWaitlistInput,
} from '@web/server/entrypoints/functions/waitlist.fn'
import { PageShell } from '@web/ui/components/layout/page/page-shell'
import Section from '@web/ui/components/layout/section'
import { Button } from '@web/ui/components/ui/button'
import { Field, FieldError, FieldLabel } from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import { Logo } from '@web/ui/components/ui/logo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/ui/components/ui/select'
import { usePostHog } from 'posthog-js/react'
import { useEffect, useState } from 'react'

const CALENDLY_URL = 'https://calendly.com/az-riposte/setup'
const GITHUB_URL = 'https://github.com/alexander-zuev/riposte'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatDateLong(d: Date) {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatDateShort(d: Date) {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`
}

function formatDateISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMockDates() {
  const now = new Date()

  const disputeFiled = new Date(now)
  disputeFiled.setDate(now.getDate() - 1)

  const responseDue = new Date(disputeFiled)
  responseDue.setDate(disputeFiled.getDate() + 7)

  const accountCreated = new Date(now)
  accountCreated.setMonth(now.getMonth() - 4)

  const lastActivity = new Date(disputeFiled)
  lastActivity.setDate(disputeFiled.getDate() - 2)

  const monthsDiff =
    (now.getFullYear() - accountCreated.getFullYear()) * 12 +
    now.getMonth() -
    accountCreated.getMonth()

  const monthRange = `${SHORT_MONTHS[accountCreated.getMonth()]}–${SHORT_MONTHS[lastActivity.getMonth()]}`

  return { disputeFiled, responseDue, accountCreated, lastActivity, monthsDiff, monthRange }
}

function StripeIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
    </svg>
  )
}

export function LandingPage() {
  return (
    <PageShell width="none" frame="full" header={<Header />}>
      <HeroSection />
      <ProblemSection />
      <ComparisonSection />
      <HowItWorksSection />
      <CTASection />
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
          render={
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            />
          }
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
          Riposte investigates disputes, builds evidence packets, and submits winning responses to
          Stripe — before the deadline runs out
        </p>

        <a
          href="#book"
          className="mt-8 inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
        >
          Try it on a real dispute
        </a>

        <div className="mt-6 flex items-center gap-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <StripeIcon className="size-4" />
            Stripe app
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GithubLogoIcon className="size-4" />
            Open source
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CurrencyDollarIcon className="size-4" />
            Flat fee per dispute
          </span>
        </div>
      </div>
    </Section>
  )
}

const PAIN_POINTS = [
  {
    image: '/images/landing/problem-cards/manual-evidence-collection.png',
    stat: '30-60 min',
    label: 'per dispute',
    detail:
      'Pulling data from Stripe, digging through your app for usage proof, formatting it, writing the argument — for every single dispute',
  },
  {
    image: '/images/landing/problem-cards/weak-evidence-submission.png',
    stat: '~12%',
    label: 'win rate',
    detail:
      'Industry average. Most merchants submit a Stripe receipt and a paragraph of text. The bank reviewer scans it in 30 seconds',
  },
  {
    image: '/images/landing/problem-cards/deadline-pressure.png',
    stat: '7-21 days',
    label: 'to respond',
    detail:
      "One submission, no edits. Miss it and you auto-lose. Most merchants don't respond at all",
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
          The customer used your product for months. But when they dispute, you submit a receipt and
          hope for the best.
        </p>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point) => (
            <div
              key={point.stat}
              className="overflow-hidden rounded-lg border border-border bg-background"
            >
              <img
                src={point.image}
                alt=""
                aria-hidden="true"
                className="aspect-video w-full border-b border-border object-cover"
                loading="lazy"
              />

              <div className="p-6">
                <span className="text-2xl font-bold text-destructive-muted-foreground">
                  {point.stat}
                </span>
                <span className="ml-2 text-sm font-medium text-foreground">{point.label}</span>
                <p className="mt-3 text-sm text-muted-foreground">{point.detail}</p>
              </div>
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
                'Activity timeline with timestamps from your app',
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

        <HandDrawnArrows />

        <EvidencePacketMock />
      </div>
    </Section>
  )
}

function HandDrawnArrows() {
  return (
    <div className="relative -mb-2 hidden h-16 w-full max-w-5xl self-center md:block">
      <svg
        viewBox="0 0 500 60"
        fill="none"
        className="absolute inset-0 h-full w-full text-muted-foreground/40"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Left card → evidence packet */}
        <path
          d="M125 2 C128 25, 180 48, 215 56"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M210 50 L216 58 L208 57"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Right card → evidence packet */}
        <path
          d="M375 2 C372 25, 320 48, 285 56"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M290 50 L284 58 L292 57"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
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
            description="AI agent pulls sessions, usage, deliveries, and support history from your app"
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

/* -------------------------------------------------------------------------------------------------
 * How It Works — Step Cards
 * ------------------------------------------------------------------------------------------------- */

function DisputeDetailCard() {
  const dates = getMockDates()

  return (
    <div className="rounded-md border border-border bg-background text-xs">
      <div className="border-b border-border px-4 pt-4 pb-3">
        <span className="text-lg font-semibold text-foreground">$199.00</span>
        <span className="ml-1 text-muted-foreground">USD</span>
        <div className="mt-2">
          <span className="inline-flex items-center rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-medium text-warning-muted-foreground">
            7 days to respond
          </span>
        </div>
      </div>

      <div className="border-b border-border bg-destructive-muted px-4 py-2.5">
        <span className="text-destructive-muted-foreground">
          The customer disputed this payment
        </span>
      </div>

      <div className="flex flex-col px-4 py-3">
        <DetailRow label="Reason" value="Fraudulent" />
        <DetailRow label="Network code" value="10.4" />
        <DetailRow label="Response due" value={formatDateLong(dates.responseDue)} highlight />
        <DetailRow
          label="Payment"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded-[2px] bg-[#1a1f71] px-1 py-px text-[7px] leading-none font-bold text-white uppercase">
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
          <DataRow label="Customer since" value="4 months" />
          <DataRow label="Total paid" value="$597" last />
        </div>
      </div>

      <div className="px-4 py-3">
        <span className="text-system text-[10px] font-medium text-muted-foreground uppercase">
          Your app
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
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="text-system font-medium text-success-muted-foreground">submitted</span>
      </div>

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
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
          {number}
        </div>
        <h3>{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-auto pt-4">{children}</div>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Evidence Packet Mock
 * ------------------------------------------------------------------------------------------------- */

function EvidencePacketMock() {
  const dates = getMockDates()

  return (
    <div className="mt-12 w-full max-w-3xl self-center overflow-hidden rounded-xl border border-border shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">evidence_dp_1R2x.pdf</span>
      </div>

      <div className="bg-background p-6 md:p-8">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <span className="text-system text-xs text-accent-muted-foreground">
              Riposte evidence packet
            </span>
            <h3 className="mt-1">Service documentation</h3>
          </div>
          <span className="text-system text-xs text-muted-foreground">dp_1R2xK4...mN8</span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h6 className="mb-2">Customer</h6>
            <div className="flex flex-col gap-1">
              <InfoRow label="Email" value="alex@example.com" />
              <InfoRow label="IP at signup" value="73.162.xx.xx" />
              <InfoRow label="Account created" value={formatDateISO(dates.accountCreated)} />
              <InfoRow label="Plan" value="Pro monthly" />
              <InfoRow label="Total paid" value="$597.00" />
            </div>
          </div>
          <div>
            <h6 className="mb-2">Usage summary</h6>
            <div className="flex flex-col gap-1 text-xs leading-5 text-muted-foreground">
              <span>
                Customer created an account on {formatDateShort(dates.accountCreated)},{' '}
                {dates.accountCreated.getFullYear()} and actively used the service for{' '}
                {dates.monthsDiff} months. Over this period, the customer logged 142 sessions,
                created 18 exports, and generated 6 reports.
              </span>
              <span>
                Last recorded activity was {formatDateShort(dates.lastActivity)} — 2 days before
                filing the dispute. No support tickets were opened. No refund was requested prior to
                dispute.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h6 className="mb-3">Activity timeline</h6>
          <div className="flex flex-col gap-1.5">
            {(
              [
                [
                  formatDateShort(dates.accountCreated),
                  'Account created, Pro plan activated',
                  'stripe',
                ],
                [dates.monthRange, '142 sessions, 18 exports, 6 reports', 'app'],
                [formatDateShort(dates.lastActivity), 'Last login — 2 days before dispute', 'app'],
                [
                  formatDateShort(dates.disputeFiled),
                  'Dispute filed — reason: fraudulent',
                  'stripe',
                ],
              ] as [string, string, string][]
            ).map(([date, event, source]) => (
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

        <div className="mt-5 border-t border-border pt-5">
          <h6 className="mb-3">Delivered outputs</h6>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex aspect-[4/3] flex-col justify-between rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Sessions</span>
                <div className="flex items-end gap-[3px]">
                  {[3, 5, 4, 7, 6, 8, 11, 9, 2, 10, 14, 12].map((h) => (
                    <div
                      key={h}
                      className="flex-1 rounded-[1px] bg-accent"
                      style={{ height: `${h * 3}px` }}
                    />
                  ))}
                </div>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">Report #14</span>
            </div>

            <div>
              <div className="flex aspect-[4/3] flex-col rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Export</span>
                <div className="mt-1 flex flex-col gap-[3px]">
                  {[65, 80, 45, 90, 55].map((w) => (
                    <div key={w} className="flex gap-1">
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

            <div>
              <div className="flex aspect-[4/3] flex-col rounded-md border border-border bg-surface p-2">
                <span className="text-[8px] font-medium text-muted-foreground">Dashboard</span>
                <div className="mt-1 grid flex-1 grid-cols-2 gap-1">
                  <div className="rounded-[2px] bg-accent/20" />
                  <div className="rounded-[2px] bg-info/20" />
                  <div className="col-span-2 rounded-[2px] bg-border/50" />
                </div>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">Dashboard</span>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Evidence prepared {formatDateLong(dates.disputeFiled)} · Sources: Stripe API, merchant
            app data
          </span>
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

/* -------------------------------------------------------------------------------------------------
 * CTA — Qualification Form + Calendly
 * ------------------------------------------------------------------------------------------------- */

type FormRoute = 'qualified' | 'waitlist' | null

function CTASection() {
  const [route, setRoute] = useState<FormRoute>(null)

  return (
    <Section id="book">
      <div className="container-max-w-4xl flex flex-col items-center">
        <h2 className="text-display text-center">Get started with your first dispute</h2>

        <div className="mt-8 w-full max-w-md">
          <QualificationForm onRoute={setRoute} />
        </div>

        {route === 'qualified' && (
          <div className="mt-8 w-full">
            <p className="mb-4 text-center text-muted-foreground">
              Pick a time — we'll set up Riposte on a real dispute together
            </p>
            <CalendlyEmbed />
          </div>
        )}

        {route === 'waitlist' && (
          <div className="mt-8 flex items-center gap-2 text-success-muted-foreground">
            <CheckIcon size={18} />
            <span className="font-medium">
              Thanks — we'll reach out when Riposte is ready for you
            </span>
          </div>
        )}
      </div>
    </Section>
  )
}

const STRIPE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const

const PRODUCT_TYPES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'ai_tool', label: 'AI tool' },
  { value: 'digital_product', label: 'Digital product' },
  { value: 'physical_goods', label: 'Physical goods' },
  { value: 'other', label: 'Other' },
] as const

const DISPUTE_OPTIONS = [
  { value: 'active', label: 'Yes, dealing with them now' },
  { value: 'recent', label: 'Yes, in the last 90 days' },
  { value: 'none', label: 'No' },
] as const

function isQualified(usesStripe?: boolean, productType?: string, hasDisputes?: string): boolean {
  if (!usesStripe) return false
  if (productType === 'physical_goods') return false
  if (hasDisputes === 'none') return false
  return true
}

function QualificationForm({ onRoute }: { onRoute: (route: FormRoute) => void }) {
  const posthog = usePostHog()

  const mutation = useMutation({
    mutationFn: async (data: {
      email: string
      productType?: string
      usesStripe?: boolean
      hasDisputes?: string
    }) => unwrapRpc(await joinWaitlist({ data })),
    onSuccess: (_, variables) => {
      const qualified = isQualified(
        variables.usesStripe,
        variables.productType,
        variables.hasDisputes,
      )

      posthog?.capture('landing_form_submitted', {
        qualified,
        uses_stripe: variables.usesStripe,
        product_type: variables.productType,
        has_disputes: variables.hasDisputes,
      })

      window.zaraz?.track('form_submit')

      onRoute(qualified ? 'qualified' : 'waitlist')
    },
  })

  const form = useForm({
    defaultValues: {
      email: '',
    } as JoinWaitlistInput,
    validators: {
      onSubmit: joinWaitlistInput,
    },
    onSubmit: ({ value }) => {
      mutation.mutate({
        email: value.email,
        usesStripe: value.usesStripe,
        productType: value.productType,
        hasDisputes: value.hasDisputes,
      })
    },
  })

  if (mutation.isSuccess) return null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <form.Field name="email">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="email"
              placeholder="you@company.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
            />
            {field.state.meta.isTouched && !field.state.meta.isValid && (
              <FieldError errors={field.state.meta.errors} />
            )}
          </Field>
        )}
      </form.Field>

      <form.Field name="usesStripe">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`${field.name}-trigger`}>Do you use Stripe?</FieldLabel>
            <Select
              value={field.state.value === undefined ? '' : field.state.value ? 'yes' : 'no'}
              onValueChange={(val) => field.handleChange(val === 'yes')}
              items={STRIPE_OPTIONS}
            >
              <SelectTrigger id={`${field.name}-trigger`} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {STRIPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="productType">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`${field.name}-trigger`}>What do you sell?</FieldLabel>
            <Select
              value={field.state.value ?? ''}
              onValueChange={(val) => field.handleChange(val ?? undefined)}
              items={PRODUCT_TYPES}
            >
              <SelectTrigger id={`${field.name}-trigger`} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="hasDisputes">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`${field.name}-trigger`}>
              Any Stripe disputes in the last 90 days?
            </FieldLabel>
            <Select
              value={field.state.value ?? ''}
              onValueChange={(val) => field.handleChange(val ?? undefined)}
              items={DISPUTE_OPTIONS}
            >
              <SelectTrigger id={`${field.name}-trigger`} className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      {mutation.isError && (
        <p className="text-sm text-destructive">Something went wrong. Try again.</p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="mt-2 w-full">
        Get started
      </Button>
    </form>
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
