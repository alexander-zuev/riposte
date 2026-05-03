import { motion, useTransform, type MotionValue } from 'motion/react'

import { WebhookCard } from './webhook-card'

interface Act1Props {
  progress: MotionValue<number>
}

export function Act1Dispute({ progress }: Act1Props) {
  // Act 1 owns 0.00–0.20 of total progress
  // Remap to local 0→1 for this act
  const local = useTransform(progress, [0, 0.2], [0, 1])

  // Card drops in from above
  const cardY = useTransform(local, [0, 0.15], [-200, 0])
  const cardOpacity = useTransform(local, [0, 0.1], [0, 1])

  // Badge appears after card settles
  const badgeOpacity = useTransform(local, [0.75, 0.85], [0, 1])
  const badgeScale = useTransform(local, [0.75, 0.85], [0.8, 1])

  // Caption fades in last
  const captionOpacity = useTransform(local, [0.88, 0.98], [0, 1])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <motion.div style={{ y: cardY, opacity: cardOpacity }}>
        <WebhookCard progress={local} />
      </motion.div>

      <motion.div
        style={{ opacity: badgeOpacity, scale: badgeScale }}
        className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-system text-sm font-medium text-destructive-muted-foreground">
          7 days remaining
        </span>
      </motion.div>

      <motion.p
        style={{ opacity: captionOpacity }}
        className="max-w-md text-center text-sm text-muted-foreground"
      >
        Customer claims they didn't authorize this charge. You have 7 days.
      </motion.p>
    </div>
  )
}
