import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

const lines: Array<{ id: string; text: string; indent?: number; color?: string }> = [
  { id: 'watching', text: '→ riposte watching...', color: 'text-muted-foreground' },
  { id: 'sep-1', text: '' },
  {
    id: 'dispute',
    text: '⚡ Dispute received: dp_1R2x...  $49.00  (fraudulent)',
    color: 'text-warning-muted-foreground',
  },
  { id: 'stripe', text: 'Querying stripe... customer: jane@acme.co', indent: 1 },
  { id: 'db', text: 'Querying database...', indent: 1 },
  {
    id: 'images',
    text: '✓ 847 images generated over 4 months',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  {
    id: 'sessions',
    text: '✓ 142 sessions, 23 hours of usage',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  {
    id: 'active',
    text: '✓ Last active: 2 days before dispute',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  {
    id: 'support',
    text: '✓ Support tickets: 0  |  Refund requests: 0',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  { id: 'sep-2', text: '' },
  { id: 'pdf', text: 'Building evidence PDF...', indent: 1 },
  {
    id: 'timeline',
    text: '✓ Activity timeline attached',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  {
    id: 'screenshots',
    text: '✓ 3 product screenshots attached',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  {
    id: 'argument',
    text: '✓ AI argument drafted',
    indent: 2,
    color: 'text-success-muted-foreground',
  },
  { id: 'sep-3', text: '' },
  { id: 'submit', text: 'Submitting to Stripe Disputes API...', indent: 1 },
  {
    id: 'done',
    text: '✓ Evidence submitted in 47 seconds',
    color: 'text-success-muted-foreground',
  },
  { id: 'notify', text: '→ Notification sent to #disputes', color: 'text-muted-foreground' },
]

export function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-border shadow-[0_0_60px_-12px_var(--lime-a5)]"
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive/60" />
          <div className="h-3 w-3 rounded-full bg-warning/60" />
          <div className="h-3 w-3 rounded-full bg-success/60" />
        </div>
        <span className="ml-2 text-xs text-muted-foreground">riposte</span>
      </div>

      <div className="bg-background p-5 text-left text-sm leading-relaxed">
        {lines.map((line, i) => {
          if (line.text === '') {
            return <div key={line.id} className="h-3" />
          }

          const indent = (line.indent ?? 0) * 1.5
          return (
            <motion.div
              key={line.id}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: i * 0.12, duration: 0.3 }}
              className={line.color ?? 'text-foreground'}
              style={{ paddingLeft: `${indent}rem` }}
            >
              {line.text}
            </motion.div>
          )
        })}

        <motion.span
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: [0, 1, 0] } : { opacity: 0 }}
          transition={{
            delay: lines.length * 0.12,
            duration: 1,
            repeat: Infinity,
          }}
          className="mt-1 inline-block h-4 w-2 bg-foreground"
        />
      </div>
    </div>
  )
}
