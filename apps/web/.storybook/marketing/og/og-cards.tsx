import {
  ArrowRightIcon,
  CaretRightIcon,
  CheckIcon,
  GithubLogoIcon,
  LightningIcon,
} from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import { LogoIcon } from '@web/ui/components/ui/logo'
import type { ReactNode } from 'react'

import { OgFrame } from './og-frame'

/**
 * Ten social-card directions for the 1200x630 OG image. Headline says "Fight",
 * not "Win" — we don't promise an outcome. The long sub-headline is replaced by
 * three short, factual value props.
 */

const DOMAIN = 'riposte.sh'
/**
 * Three short, factual value props — competitive wedges, never a win-rate
 * promise. Open-source (AGPLv3); flat fee per dispute, no percentage of
 * recovered funds (Chargeflow takes 25%, Stripe Smart Disputes 30% — per
 * research/product-research.md); evidence pulled from the merchant's own
 * database via MCP, which the incumbents can't access. No dollar figure here —
 * the model is durable, a specific price on a cached OG image is not.
 */
const BENEFITS = ['Open-source', 'Flat fee, no % cut', 'Evidence from your data'] as const

/** Brand lockup: lime shard mark + monospace wordmark. */
function Wordmark({
  iconSize = 40,
  className,
  textClassName = 'text-[34px]',
}: {
  iconSize?: number
  className?: string
  textClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoIcon size={iconSize} className="text-accent" />
      <span className={cn('font-brand font-bold tracking-[0.08em]', textClassName)}>Riposte</span>
    </span>
  )
}

function Domain({ className }: { className?: string }) {
  return (
    <span className={cn('font-brand text-[30px] font-semibold tracking-wide', className)}>
      {DOMAIN}
    </span>
  )
}

/** Three value props as a vertical list with lime markers — clean at any width. */
function BenefitList({
  className,
  tone = 'text-primary-foreground/85',
}: {
  className?: string
  tone?: string
}) {
  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {BENEFITS.map((b) => (
        <li key={b} className={cn('flex items-center gap-4 font-brand text-[30px]', tone)}>
          <CaretRightIcon size={32} className="shrink-0 text-accent" />
          {b}
        </li>
      ))}
    </ul>
  )
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-5 py-2 font-brand text-[20px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Faint lime dotted grid for dark cards. */
function DotGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage: 'radial-gradient(var(--accent) 1.5px, transparent 1.5px)',
        backgroundSize: '32px 32px',
      }}
    />
  )
}

// 01 — Tactical dark, centered headline.
function OptionTacticalDark() {
  return (
    <OgFrame className="flex-col justify-between bg-primary p-16 text-primary-foreground">
      <DotGrid />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          opacity: 0.14,
        }}
      />
      <header className="relative flex items-center justify-between">
        <Wordmark />
        <Pill className="border-primary-foreground/15 text-primary-foreground/70">
          <GithubLogoIcon size={22} /> Open source
        </Pill>
      </header>
      <div className="relative max-w-[900px]">
        <h2 className="text-[72px] leading-[1.05] font-bold tracking-tight">
          Fight Stripe disputes <span className="text-accent">on autopilot</span>
        </h2>
        <BenefitList className="mt-7" />
      </div>
      <footer className="relative flex items-center justify-between text-primary-foreground/50">
        <Domain />
        <span className="font-brand text-[20px]">7–21 days → 47 seconds</span>
      </footer>
    </OgFrame>
  )
}

// 02 — Lime split panel.
function OptionLimeSplit() {
  return (
    <OgFrame>
      <div className="flex w-[300px] flex-col justify-between bg-accent p-12 text-accent-foreground">
        <Wordmark iconSize={32} className="text-accent-foreground" textClassName="text-[26px]" />
        <LogoIcon size={132} className="text-accent-foreground" />
        <Domain className="text-accent-foreground/70" />
      </div>
      <div className="flex flex-1 flex-col justify-center bg-primary p-16 text-primary-foreground">
        <h2 className="text-[64px] leading-[1.05] font-bold tracking-tight">
          Fight Stripe disputes on autopilot
        </h2>
        <BenefitList className="mt-7" />
      </div>
    </OgFrame>
  )
}

// 03 — Terminal / OSS developer feel.
function OptionTerminal() {
  const lines = [
    { t: '$ riposte watch', muted: true },
    { t: '✓ dispute.created   reason: product_not_received' },
    { t: '✓ evidence assembled   9 artifacts from your DB' },
    { t: '✓ submitted to Stripe in 47s', accent: true },
  ]
  return (
    <OgFrame className="flex-col justify-between bg-primary p-16 text-primary-foreground">
      <DotGrid />
      <header className="relative flex items-center justify-between">
        <Wordmark />
        <Domain className="text-primary-foreground/50" />
      </header>
      <div className="relative rounded-2xl border border-primary-foreground/15 bg-black/40">
        <div className="flex items-center gap-2 border-b border-primary-foreground/10 px-6 py-4">
          <span className="h-3.5 w-3.5 rounded-full bg-destructive" />
          <span className="h-3.5 w-3.5 rounded-full bg-warning" />
          <span className="h-3.5 w-3.5 rounded-full bg-success" />
        </div>
        <pre className="px-8 py-7 font-brand text-[26px] leading-[1.7]">
          {lines.map((l) => (
            <div
              key={l.t}
              className={cn(
                l.accent
                  ? 'text-accent'
                  : l.muted
                    ? 'text-primary-foreground/45'
                    : 'text-primary-foreground/90',
              )}
            >
              {l.t}
            </div>
          ))}
        </pre>
      </div>
      <h2 className="relative text-[40px] font-bold tracking-tight">
        Fight Stripe disputes <span className="text-accent">on autopilot</span>
      </h2>
    </OgFrame>
  )
}

// 04 — Big stat.
function OptionStat() {
  return (
    <OgFrame className="items-stretch bg-primary text-primary-foreground">
      <DotGrid />
      <div className="relative flex flex-1 items-center justify-center">
        <span className="text-[300px] leading-none font-bold tracking-tighter text-accent">
          47s
        </span>
      </div>
      <div className="relative flex w-[460px] flex-col justify-between border-l border-primary-foreground/10 p-14">
        <Wordmark iconSize={34} textClassName="text-[28px]" />
        <p className="text-[40px] leading-[1.1] font-bold tracking-tight">
          From webhook to submitted evidence.
        </p>
        <div className="flex flex-col gap-2 text-primary-foreground/55">
          <span className="font-brand text-[20px]">Open source · AGPLv3</span>
          <Domain />
        </div>
      </div>
    </OgFrame>
  )
}

// 05 — Headline + capability badges.
function OptionBadges() {
  const badges = ['Open source', 'AGPLv3', 'Cloudflare Workers', 'Stripe-native']
  return (
    <OgFrame className="flex-col justify-between bg-primary p-16 text-primary-foreground">
      <DotGrid />
      <Wordmark />
      <h2 className="relative max-w-[940px] text-[68px] leading-[1.04] font-bold tracking-tight">
        Fight Stripe disputes <span className="text-accent">on autopilot</span>
      </h2>
      <div className="relative flex flex-wrap items-center gap-3">
        {badges.map((b) => (
          <Pill key={b} className="border-primary-foreground/15 text-primary-foreground/75">
            {b}
          </Pill>
        ))}
        <Domain className="ml-auto text-primary-foreground/50" />
      </div>
    </OgFrame>
  )
}

// 06 — Light editorial.
function OptionLight() {
  return (
    <OgFrame className="flex-col justify-between bg-background p-16 text-foreground">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Domain className="text-muted-foreground" />
      </header>
      <h2 className="max-w-[940px] text-[74px] leading-[1.03] font-bold tracking-tight">
        Fight Stripe disputes{' '}
        <span className="relative whitespace-nowrap">
          on autopilot
          <span className="absolute right-0 -bottom-2 left-0 h-3 rounded bg-accent" />
        </span>
      </h2>
      <BenefitList tone="text-foreground/70" />
    </OgFrame>
  )
}

// 07 — Before / after.
function OptionBeforeAfter() {
  return (
    <OgFrame className="bg-primary text-primary-foreground">
      <DotGrid />
      <div className="relative flex flex-1 flex-col justify-center gap-3 p-14">
        <span className="font-brand text-[22px] tracking-wide text-primary-foreground/45">
          Manual response
        </span>
        <span className="text-[120px] leading-none font-bold tracking-tighter text-primary-foreground/35">
          7–21d
        </span>
        <span className="text-[24px] text-primary-foreground/45">
          dashboards, screenshots, hope
        </span>
      </div>
      <div className="relative flex items-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ArrowRightIcon size={40} />
        </span>
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-3 border-l border-primary-foreground/10 bg-accent/[0.06] p-14">
        <Wordmark iconSize={30} textClassName="text-[24px]" />
        <span className="text-[120px] leading-none font-bold tracking-tighter text-accent">
          47s
        </span>
        <span className="text-[24px] text-primary-foreground/70">evidence auto-assembled</span>
      </div>
    </OgFrame>
  )
}

// 08 — Webhook in, evidence out.
function OptionFlow() {
  function Node({ label, children }: { label: string; children: ReactNode }) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-primary-foreground/15 bg-black/30">
          {children}
        </div>
        <span className="font-brand text-[20px] text-primary-foreground/60">{label}</span>
      </div>
    )
  }
  return (
    <OgFrame className="flex-col justify-between bg-primary p-16 text-primary-foreground">
      <DotGrid />
      <Wordmark />
      <div className="relative flex items-center justify-center gap-8">
        <Node label="Stripe webhook">
          <LightningIcon size={56} className="text-primary-foreground/80" />
        </Node>
        <ArrowRightIcon size={44} className="text-accent" />
        <Node label="Riposte agent">
          <LogoIcon size={64} className="text-accent" />
        </Node>
        <ArrowRightIcon size={44} className="text-accent" />
        <Node label="Evidence submitted">
          <CheckIcon size={56} className="text-accent" />
        </Node>
      </div>
      <h2 className="relative text-center text-[52px] font-bold tracking-tight">
        Webhook in. <span className="text-accent">Evidence out.</span>
      </h2>
    </OgFrame>
  )
}

// 09 — Brand-forward oversized wordmark.
function OptionWordmark() {
  return (
    <OgFrame className="flex-col items-center justify-center gap-8 bg-primary text-primary-foreground">
      <DotGrid />
      <LogoIcon size={120} className="relative text-accent" />
      <span className="relative font-brand text-[120px] leading-none font-bold tracking-[0.06em]">
        Riposte
      </span>
      <p className="relative text-[30px] text-primary-foreground/65">
        Fight Stripe disputes <span className="text-accent">on autopilot</span>
      </p>
      <Domain className="relative mt-2 text-primary-foreground/40" />
    </OgFrame>
  )
}

// 10 — Headline + product mock.
function OptionProductMock() {
  const evidence = [
    'Account age & login history',
    'Session + usage logs',
    'Delivery / access proof',
  ]
  return (
    <OgFrame className="bg-primary text-primary-foreground">
      <DotGrid />
      <div className="relative flex flex-1 flex-col justify-between p-14">
        <Wordmark />
        <h2 className="text-[58px] leading-[1.05] font-bold tracking-tight">
          Fight Stripe disputes <span className="text-accent">on autopilot</span>
        </h2>
        <Domain className="text-primary-foreground/50" />
      </div>
      <div className="relative flex w-[470px] items-center p-12">
        <div className="w-full rounded-2xl border border-primary-foreground/15 bg-black/30 p-8">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-warning-muted px-3 py-1 font-brand text-[18px] text-warning-foreground-low-contrast">
              product_not_received
            </span>
            <span className="font-brand text-[18px] text-primary-foreground/60">Due in 6d</span>
          </div>
          <div className="mt-7 flex flex-col gap-4">
            {evidence.map((e) => (
              <div
                key={e}
                className="flex items-center gap-3 text-[21px] text-primary-foreground/85"
              >
                <CheckIcon size={24} className="text-accent" /> {e}
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 rounded-lg bg-accent px-5 py-3 text-accent-foreground">
            <CheckIcon size={24} />{' '}
            <span className="text-[22px] font-medium">Submitted in 47s</span>
          </div>
        </div>
      </div>
    </OgFrame>
  )
}

export type OgOption = {
  slug: string
  name: string
  description: string
  Component: () => ReactNode
}

export const OG_OPTIONS: OgOption[] = [
  {
    slug: 'tactical-dark',
    name: 'Option 01',
    description: 'Tactical dark, centered headline',
    Component: OptionTacticalDark,
  },
  {
    slug: 'lime-split',
    name: 'Option 02',
    description: 'Lime split panel',
    Component: OptionLimeSplit,
  },
  { slug: 'terminal', name: 'Option 03', description: 'Terminal / OSS', Component: OptionTerminal },
  { slug: 'stat', name: 'Option 04', description: 'Big 47s stat', Component: OptionStat },
  {
    slug: 'badges',
    name: 'Option 05',
    description: 'Headline + capability badges',
    Component: OptionBadges,
  },
  { slug: 'light', name: 'Option 06', description: 'Light editorial', Component: OptionLight },
  {
    slug: 'before-after',
    name: 'Option 07',
    description: 'Before / after speed',
    Component: OptionBeforeAfter,
  },
  {
    slug: 'flow',
    name: 'Option 08',
    description: 'Webhook in, evidence out',
    Component: OptionFlow,
  },
  {
    slug: 'wordmark',
    name: 'Option 09',
    description: 'Brand-forward wordmark',
    Component: OptionWordmark,
  },
  {
    slug: 'product-mock',
    name: 'Option 10',
    description: 'Headline + dispute card',
    Component: OptionProductMock,
  },
]
