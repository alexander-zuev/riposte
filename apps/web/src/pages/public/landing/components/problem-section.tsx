import Section from '@web/ui/components/layout/section'
import { motion } from 'motion/react'

import { AnimatedCounter } from './animated-counter'
import { SectionBadge } from './section-badge'

const costs = [
  {
    stat: { value: 15, prefix: '$' },
    label: 'fee per dispute',
    detail: '+ lost revenue on top',
    color: 'text-destructive-muted-foreground',
  },
  {
    stat: { value: 3, suffix: ' hrs' },
    label: 'to fight manually',
    detail: 'gathering evidence you already have',
    color: 'text-warning-muted-foreground',
  },
  {
    stat: { value: 25, suffix: '%' },
    label: 'cut to outsource',
    detail: 'and they only see what Stripe sees',
    color: 'text-destructive-muted-foreground',
  },
]

export function ProblemSection() {
  return (
    <Section background="panel">
      <div className="container-max-w-6xl flex flex-col items-center">
        <SectionBadge>The cost of doing nothing</SectionBadge>

        <h2 className="text-display mt-4 text-center">Every dispute has a price</h2>

        <div className="mt-16 grid w-full grid-cols-1 gap-8 md:grid-cols-3">
          {costs.map((cost, i) => (
            <motion.div
              key={cost.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <div className={`text-5xl font-bold ${cost.color}`}>
                <AnimatedCounter {...cost.stat} />
              </div>
              <p className="mt-3 font-medium text-foreground">{cost.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{cost.detail}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 max-w-2xl text-center text-muted-foreground"
        >
          They all have the same problem: they only see what Stripe sees.{' '}
          <span className="text-foreground">That's not evidence — that's a receipt.</span>
        </motion.p>
      </div>
    </Section>
  )
}
