import { motion, useTransform, type MotionValue } from 'motion/react'

interface Act5Props {
  progress: MotionValue<number>
}

export function Act5Win({ progress }: Act5Props) {
  const local = useTransform(progress, [0.8, 1.0], [0, 1])

  // Card appears
  const cardOpacity = useTransform(local, [0, 0.15], [0, 1])
  const cardScale = useTransform(local, [0, 0.15], [0.9, 1])

  // Status morphs
  const wonOpacity = useTransform(local, [0.2, 0.3], [0, 1])

  // Amount
  const amountOpacity = useTransform(local, [0.35, 0.45], [0, 1])

  // Subtitle
  const subtitleOpacity = useTransform(local, [0.5, 0.6], [0, 1])

  // CTA
  const ctaOpacity = useTransform(local, [0.7, 0.85], [0, 1])
  const ctaY = useTransform(local, [0.7, 0.85], [20, 0])

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Winning dispute card */}
      <motion.div
        style={{ opacity: cardOpacity, scale: cardScale }}
        className="flex flex-col items-center rounded-xl border border-border bg-background px-12 py-10 shadow-lg"
      >
        <div className="text-system text-xs text-muted-foreground">dp_1R2xK4LkdIwHu7ix</div>

        <motion.div
          style={{ opacity: wonOpacity }}
          className="mt-4 rounded-full bg-success/15 px-4 py-1.5"
        >
          <span className="text-system text-sm font-bold text-success-muted-foreground">✓ WON</span>
        </motion.div>

        <motion.div
          style={{ opacity: amountOpacity }}
          className="mt-4 text-3xl font-bold text-success-muted-foreground"
        >
          +$249.00
        </motion.div>

        <motion.div
          style={{ opacity: amountOpacity }}
          className="mt-1 text-system text-xs text-muted-foreground"
        >
          recovered
        </motion.div>
      </motion.div>

      <motion.p
        style={{ opacity: subtitleOpacity }}
        className="mt-6 text-system text-sm text-muted-foreground"
      >
        47 seconds. Zero effort.
      </motion.p>

      {/* CTA */}
      <motion.div
        style={{ opacity: ctaOpacity, y: ctaY }}
        className="mt-10 flex flex-col items-center gap-4"
      >
        <p className="text-lg font-medium text-foreground">Stop losing disputes you should win</p>
        <a
          href="/sign-in"
          className="inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
        >
          Get Started Free
        </a>
      </motion.div>
    </div>
  )
}
