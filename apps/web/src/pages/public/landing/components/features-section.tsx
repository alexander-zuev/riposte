import type { IconWeight } from '@phosphor-icons/react'
import { Pulse, Target, FileText, Lightning } from '@phosphor-icons/react'
import Section from '@web/ui/components/layout/section'
import { motion, useInView } from 'motion/react'
import type { ComponentType, ReactNode } from 'react'
import { useRef } from 'react'

import { SectionBadge } from './section-badge'

function EvidenceComparisonVisual() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
      <div className="rounded-md border border-border bg-surface p-3">
        <div className="font-medium text-destructive-muted-foreground">Stripe alone</div>
        <div className="mt-2 space-y-1 text-muted-foreground">
          <div>Card ending 4242</div>
          <div>Amount: $49.00</div>
          <div>Date: Apr 28</div>
        </div>
      </div>
      <div className="rounded-md border border-border bg-surface p-3">
        <div className="font-medium text-success-muted-foreground">With Riposte</div>
        <div className="mt-2 space-y-1 text-muted-foreground">
          <div>142 sessions logged</div>
          <div>23h active usage</div>
          <div>Last login: 2d ago</div>
          <div>Support tickets: 0</div>
          <div>Refund requests: 0</div>
        </div>
      </div>
    </div>
  )
}

function DisputeTypesVisual() {
  const types = [
    { label: 'Fraudulent', color: 'bg-destructive' },
    { label: 'Product not received', color: 'bg-warning' },
    { label: 'Subscription canceled', color: 'bg-info' },
    { label: 'Duplicate', color: 'bg-accent' },
  ]
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {types.map((t) => (
        <span
          key={t.label}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${t.color}`} />
          {t.label}
        </span>
      ))}
    </div>
  )
}

function EvidenceDocVisual() {
  return (
    <div className="mt-4 rounded-md border border-border bg-surface p-3 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-medium text-foreground">evidence_dp_1R2x.pdf</span>
        <span>4 pages</span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-success-muted-foreground">§1</span>
          <span className="text-muted-foreground">Customer activity timeline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success-muted-foreground">§2</span>
          <span className="text-muted-foreground">Product delivery proof</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success-muted-foreground">§3</span>
          <span className="text-muted-foreground">Usage screenshots</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-success-muted-foreground">§4</span>
          <span className="text-muted-foreground">Written argument</span>
        </div>
      </div>
    </div>
  )
}

function AutomationVisual() {
  const steps = ['Webhook', 'Evidence', 'PDF', 'Submitted']
  return (
    <div className="mt-4 flex items-center gap-1 text-xs">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-muted-foreground">
            {step}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  )
}

const features: Array<{
  icon: ComponentType<{ className?: string; weight?: IconWeight }>
  iconColor: string
  title: string
  description: string
  visual: ReactNode
}> = [
  {
    icon: Pulse,
    iconColor: 'text-accent',
    title: 'Customer-based evidence',
    description:
      'Builds evidence from what your customers actually did — sessions, usage, logins, support history. 10x more than Stripe data alone.',
    visual: <EvidenceComparisonVisual />,
  },
  {
    icon: Target,
    iconColor: 'text-accent-secondary',
    title: 'Adapts to dispute type',
    description:
      'Different evidence strategy for each reason code. Fraudulent needs different proof than product not received.',
    visual: <DisputeTypesVisual />,
  },
  {
    icon: FileText,
    iconColor: 'text-accent',
    title: 'Structured, scannable evidence',
    description:
      'Concise evidence document that meets Stripe requirements. Easy for bank reviewers to process in seconds.',
    visual: <EvidenceDocVisual />,
  },
  {
    icon: Lightning,
    iconColor: 'text-accent-secondary',
    title: 'Fully automatic',
    description:
      'Webhook-triggered. No manual steps from dispute to submission. Never miss a deadline.',
    visual: <AutomationVisual />,
  },
]

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <Section background="panel">
      <div ref={ref} className="container-max-w-6xl flex flex-col items-center">
        <SectionBadge>Features</SectionBadge>

        <h2 className="text-display mt-4 text-center">Everything you need to win</h2>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className="rounded-lg border border-border bg-background p-6"
            >
              <feature.icon className={`h-6 w-6 ${feature.iconColor}`} weight="duotone" />
              <h3 className="mt-3">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              {feature.visual}
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}
