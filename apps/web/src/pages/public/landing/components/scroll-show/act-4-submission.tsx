import { motion, useTransform, type MotionValue } from 'motion/react'

interface Act4Props {
  progress: MotionValue<number>
}

export function Act4Submission({ progress }: Act4Props) {
  const local = useTransform(progress, [0.65, 0.8], [0, 1])

  // Document envelope appears
  const envelopeOpacity = useTransform(local, [0, 0.1], [0, 1])
  const envelopeScale = useTransform(local, [0, 0.1], [0.9, 1])

  // Envelope flies up
  const envelopeY = useTransform(local, [0.2, 0.55], [0, -120])

  // Endpoint appears at top
  const endpointOpacity = useTransform(local, [0.15, 0.25], [0, 1])

  // Flash on arrival
  const flashOpacity = useTransform(local, [0.55, 0.6, 0.65], [0, 0.6, 0])

  // Status text
  const submittingOpacity = useTransform(local, [0.3, 0.38], [0, 1])
  const submittingDisplay = useTransform(local, [0.65, 0.66], [1, 0])
  const checkOpacity = useTransform(local, [0.66, 0.72], [0, 1])

  // Timer
  const timerOpacity = useTransform(local, [0.75, 0.82], [0, 1])

  // Slack notification
  const slackX = useTransform(local, [0.85, 0.95], [300, 0])
  const slackOpacity = useTransform(local, [0.85, 0.95], [0, 1])

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Stripe API endpoint */}
      <motion.div
        style={{ opacity: endpointOpacity }}
        className="mb-16 rounded-lg border border-border bg-surface px-6 py-3 text-system text-xs"
      >
        <span className="text-muted-foreground">POST</span>{' '}
        <span className="text-foreground">api.stripe.com/v1/disputes/dp_1R2x/evidence</span>
      </motion.div>

      {/* Flash effect */}
      <motion.div
        style={{ opacity: flashOpacity }}
        className="pointer-events-none absolute inset-0 bg-accent/10"
      />

      {/* Document envelope */}
      <motion.div
        style={{ opacity: envelopeOpacity, scale: envelopeScale, y: envelopeY }}
        className="rounded-lg border border-border bg-background px-8 py-5 shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="text-system text-xs">
            <div className="font-medium text-foreground">dp_1R2xK4...mN8</div>
            <div className="mt-1 text-muted-foreground">4 pages · PDF</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-success bg-success/10">
            <span className="text-sm text-success-muted-foreground">✓</span>
          </div>
        </div>
      </motion.div>

      {/* Status text */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <motion.span
          style={{
            opacity: useTransform(local, (v) => {
              const show = v >= 0.3 && v < 0.66 ? 1 : 0
              return show
            }),
          }}
          className="text-system text-sm text-muted-foreground"
        >
          Submitting to Stripe Disputes API...
        </motion.span>

        <motion.span
          style={{ opacity: checkOpacity }}
          className="text-system text-sm text-success-muted-foreground"
        >
          ✓ Evidence submitted
        </motion.span>

        <motion.span
          style={{ opacity: timerOpacity }}
          className="text-system text-2xl font-bold text-foreground"
        >
          47 seconds
        </motion.span>
      </div>

      {/* Slack notification */}
      <motion.div
        style={{ x: slackX, opacity: slackOpacity }}
        className="absolute right-8 bottom-12 rounded-lg border border-border bg-background px-4 py-3 shadow-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <span className="text-system text-xs text-muted-foreground">
            <span className="text-foreground">#disputes</span> — Evidence submitted for dp_1R2x
            ($249.00)
          </span>
        </div>
      </motion.div>
    </div>
  )
}
