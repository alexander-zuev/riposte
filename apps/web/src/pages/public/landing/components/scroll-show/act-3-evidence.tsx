import { motion, useTransform, type MotionValue } from 'motion/react'

interface Act3Props {
  progress: MotionValue<number>
}

function DocSection({
  number,
  title,
  children,
  progress,
  entryPoint,
}: {
  number: string
  title: string
  children: React.ReactNode
  progress: MotionValue<number>
  entryPoint: number
}) {
  const opacity = useTransform(progress, [entryPoint, entryPoint + 0.06], [0, 1])
  const y = useTransform(progress, [entryPoint, entryPoint + 0.06], [10, 0])

  return (
    <motion.div style={{ opacity, y }} className="mt-4 first:mt-0">
      <div className="flex items-baseline gap-2">
        <span className="text-system text-xs text-accent">{number}.</span>
        <span className="text-xs font-medium tracking-wide text-foreground uppercase">{title}</span>
      </div>
      <div className="mt-2 pl-5">{children}</div>
    </motion.div>
  )
}

export function Act3Evidence({ progress }: Act3Props) {
  const local = useTransform(progress, [0.45, 0.65], [0, 1])

  // Document container
  const docOpacity = useTransform(local, [0, 0.08], [0, 1])
  const docScale = useTransform(local, [0, 0.08], [0.95, 1])

  // Progress bar
  const barWidth = useTransform(local, [0.7, 0.92], [0, 100])
  const barOpacity = useTransform(local, [0.7, 0.75], [0, 1])
  const checkOpacity = useTransform(local, [0.92, 0.98], [0, 1])

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <motion.div
        style={{ opacity: docOpacity, scale: docScale }}
        className="w-full max-w-lg rounded-lg border border-border bg-background shadow-lg"
      >
        {/* Document header */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-foreground uppercase">
              Evidence Submission
            </span>
            <span className="text-system text-xs text-muted-foreground">May 3, 2026</span>
          </div>
          <div className="mt-1 text-system text-xs text-muted-foreground">
            Dispute dp_1R2xK4LkdIwHu7ix
          </div>
        </div>

        {/* Document body */}
        <div className="px-6 py-4">
          <DocSection number="1" title="Executive Summary" progress={local} entryPoint={0.1}>
            <div className="space-y-1 text-system text-xs text-muted-foreground">
              <div>
                Dispute Amount: <span className="text-destructive-muted-foreground">$249.00</span>
              </div>
              <div>
                Reason: <span className="text-foreground">Fraudulent</span>
              </div>
              <div>
                Recommendation:{' '}
                <span className="text-success-muted-foreground">Contest — strong evidence</span>
              </div>
            </div>
          </DocSection>

          <DocSection
            number="2"
            title="Customer Activity Timeline"
            progress={local}
            entryPoint={0.22}
          >
            <div className="space-y-1 text-system text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-accent">│</span>
                <span>Jan 3 — Account created</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">│</span>
                <span>Jan 5 — First session</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">│</span>
                <span>Feb–Apr — 142 sessions, 23h active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">│</span>
                <span>Apr 26 — Last active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-destructive">│</span>
                <span>Apr 28 — Dispute filed</span>
              </div>
            </div>
          </DocSection>

          <DocSection number="3" title="Product Delivery Proof" progress={local} entryPoint={0.38}>
            <div className="space-y-1 text-system text-xs text-muted-foreground">
              <div>
                <span className="text-success-muted-foreground">✓</span> 847 images generated
              </div>
              <div>
                <span className="text-success-muted-foreground">✓</span> 12 successful payments
              </div>
              <div>
                <span className="text-success-muted-foreground">✓</span> 0 support complaints
              </div>
            </div>
          </DocSection>

          <DocSection number="4" title="AI-Drafted Argument" progress={local} entryPoint={0.52}>
            <p className="text-xs leading-relaxed text-muted-foreground italic">
              "The cardholder created their account on Jan 3, 2026 and actively used the service for
              4 months with 142 sessions totaling 23 hours of usage. The purchase IP matches
              subsequent login IPs, and no support tickets or refund requests were filed..."
            </p>
          </DocSection>
        </div>

        {/* Document footer */}
        <div className="border-t border-border px-6 py-3">
          <div className="flex items-center justify-between text-system text-xs text-muted-foreground">
            <span>Generated by Riposte</span>
            <span>4 pages · PDF</span>
          </div>
        </div>
      </motion.div>

      {/* Progress bar */}
      <motion.div style={{ opacity: barOpacity }} className="mt-6 w-full max-w-lg">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <motion.div
              style={{ width: useTransform(barWidth, (v) => `${v}%`) }}
              className="h-full rounded-full bg-accent"
            />
          </div>
          <motion.span
            style={{ opacity: checkOpacity }}
            className="text-system text-xs text-success-muted-foreground"
          >
            ✓ Complete
          </motion.span>
        </div>
      </motion.div>
    </div>
  )
}
