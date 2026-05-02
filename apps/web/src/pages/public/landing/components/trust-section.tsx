import { Eye, Key, GitBranch, ShieldCheck } from '@phosphor-icons/react'
import Section from '@web/ui/components/layout/section'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

import { SectionBadge } from './section-badge'

const guarantees = [
  {
    icon: Eye,
    title: 'Read-only everywhere',
    detail: 'Riposte never writes to your systems. Stripe, database, support — all query-only.',
  },
  {
    icon: Key,
    title: 'You control every scope',
    detail: 'Choose exactly what Riposte can access. Revoke anytime.',
  },
  {
    icon: GitBranch,
    title: 'Open-source — AGPLv3',
    detail: 'Inspect every line. Self-host if you want full control.',
  },
  {
    icon: ShieldCheck,
    title: 'No hallucinated evidence',
    detail: 'Real data from your systems. AI drafts arguments, not facts.',
  },
]

export function TrustSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <Section>
      <div ref={ref} className="container-max-w-5xl flex flex-col items-center">
        <SectionBadge>Security</SectionBadge>

        <h2 className="text-display mt-4 text-center">Built for paranoid founders</h2>

        <div className="mt-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {guarantees.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5"
            >
              <g.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" weight="duotone" />
              <div>
                <p className="font-medium text-foreground">{g.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{g.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  )
}
