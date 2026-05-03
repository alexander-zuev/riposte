import Section from '@web/ui/components/layout/section'
import { motion } from 'motion/react'

import { SectionBadge } from './section-badge'

function WebhookCard() {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-left text-xs">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-warning" />
        <span className="font-medium text-warning-muted-foreground">dispute.created</span>
      </div>
      <div className="mt-3 space-y-1.5 text-muted-foreground">
        <div>
          <span className="text-foreground">id:</span> dp_1R2xK4...mN8
        </div>
        <div>
          <span className="text-foreground">amount:</span>{' '}
          <span className="text-destructive-muted-foreground">$49.00</span>
        </div>
        <div>
          <span className="text-foreground">reason:</span> fraudulent
        </div>
        <div>
          <span className="text-foreground">due:</span>{' '}
          <span className="text-destructive-muted-foreground">7 days</span>
        </div>
      </div>
    </div>
  )
}

function EvidenceCard() {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-left text-xs">
      <div className="flex items-center gap-2">
        <div className="bg-accent-secondary h-2 w-2 rounded-full" />
        <span className="text-accent-secondary-muted-foreground font-medium">
          gathering evidence
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        <div>
          <div className="text-muted-foreground">stripe</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Customer since</span>
            <span className="text-success-muted-foreground">✓ 4 months</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Refund requests</span>
            <span className="text-success-muted-foreground">✓ 0</span>
          </div>
        </div>
        <div className="border-t border-border pt-2">
          <div className="text-muted-foreground">your database</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Sessions</span>
            <span className="text-success-muted-foreground">✓ 142</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Active usage</span>
            <span className="text-success-muted-foreground">✓ 23h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last seen</span>
            <span className="text-success-muted-foreground">✓ 2d ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmittedCard() {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-left text-xs">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-success" />
        <span className="font-medium text-success-muted-foreground">submitted</span>
      </div>
      <div className="mt-3 space-y-1.5 text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Evidence PDF</span>
          <span className="text-success-muted-foreground">✓ uploaded</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Activity timeline</span>
          <span className="text-success-muted-foreground">✓ attached</span>
        </div>
        <div className="flex items-center justify-between">
          <span>AI argument</span>
          <span className="text-success-muted-foreground">✓ drafted</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Slack</span>
          <span className="text-success-muted-foreground">✓ #disputes</span>
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    number: '1',
    title: 'Webhook fires',
    description: 'Stripe notifies Riposte the moment a dispute is created.',
    visual: <WebhookCard />,
  },
  {
    number: '2',
    title: 'Evidence pulled',
    description: 'Checks real customer activity across all your systems.',
    visual: <EvidenceCard />,
  },
  {
    number: '3',
    title: 'Case submitted',
    description: 'Accurate, complete, and structured to win.',
    visual: <SubmittedCard />,
  },
]

export function HowItWorksSection() {
  return (
    <Section>
      <div className="container-max-w-6xl flex flex-col items-center">
        <SectionBadge>How it works</SectionBadge>

        <h2 className="text-display mt-4 text-center">Dispute comes in. Evidence goes out.</h2>

        <div className="mt-16 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              className="flex flex-col rounded-lg border border-border bg-surface p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
                  {step.number}
                </div>
                <h3>{step.title}</h3>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">{step.description}</p>

              <div className="mt-auto">{step.visual}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-16 text-center text-sm text-muted-foreground"
        >
          90% deterministic. 10% AI. No hallucinated evidence.
        </motion.p>
      </div>
    </Section>
  )
}
