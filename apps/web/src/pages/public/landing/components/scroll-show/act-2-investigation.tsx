import { motion, useTransform, type MotionValue } from 'motion/react'

interface Act2Props {
  progress: MotionValue<number>
}

const stripeEvidence = [
  'Customer since: Jan 3, 2026',
  '12 successful payments',
  '0 previous disputes',
  '0 refund requests',
]

const dbEvidence = [
  '142 sessions logged',
  '23h active usage',
  '847 images generated',
  'Last active: 2 days before dispute',
]

const logEvidence = [
  'Purchase IP: 192.168.1.x (US)',
  'Login IP matches purchase IP',
  'Device fingerprint: consistent',
  'Support tickets: 0',
]

function EvidenceChip({
  text,
  progress,
  entryPoint,
}: {
  text: string
  progress: MotionValue<number>
  entryPoint: number
}) {
  const opacity = useTransform(progress, [entryPoint, entryPoint + 0.04], [0, 1])
  const x = useTransform(progress, [entryPoint, entryPoint + 0.04], [20, 0])

  return (
    <motion.div
      style={{ opacity, x }}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs"
    >
      <span className="text-success-muted-foreground">✓</span>
      <span className="text-system text-foreground">{text}</span>
    </motion.div>
  )
}

function SourceNode({
  label,
  icon,
  evidence,
  progress,
  baseEntry,
  side,
}: {
  label: string
  icon: string
  evidence: string[]
  progress: MotionValue<number>
  baseEntry: number
  side: 'left' | 'right' | 'center'
}) {
  const nodeOpacity = useTransform(progress, [baseEntry - 0.05, baseEntry], [0, 1])
  const nodeScale = useTransform(progress, [baseEntry - 0.05, baseEntry], [0.8, 1])

  const alignment =
    side === 'left' ? 'items-end' : side === 'right' ? 'items-start' : 'items-center'

  return (
    <motion.div
      style={{ opacity: nodeOpacity, scale: nodeScale }}
      className={`flex flex-col gap-2 ${alignment}`}
    >
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2">
        <span className="text-base">{icon}</span>
        <span className="text-system text-xs font-medium text-foreground">{label}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {evidence.map((item, i) => (
          <EvidenceChip
            key={item}
            text={item}
            progress={progress}
            entryPoint={baseEntry + i * 0.04}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function Act2Investigation({ progress }: Act2Props) {
  const local = useTransform(progress, [0.2, 0.45], [0, 1])

  // Dispute card summary stays centered
  const cardOpacity = useTransform(local, [0, 0.08], [0, 1])
  const cardScale = useTransform(local, [0, 0.08], [0.9, 1])

  // Caption at bottom
  const captionOpacity = useTransform(local, [0.9, 1], [0, 1])

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      {/* Dispute card summary - compact version */}
      <motion.div
        style={{ opacity: cardOpacity, scale: cardScale }}
        className="mb-8 rounded-lg border border-border bg-background px-5 py-3 text-center text-system text-xs"
      >
        <span className="text-muted-foreground">dp_1R2xK4...</span>
        <span className="mx-3 font-medium text-destructive-muted-foreground">$249.00</span>
        <span className="text-warning-muted-foreground">fraudulent</span>
      </motion.div>

      {/* Three source columns */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
        <SourceNode
          label="Stripe API"
          icon="⚡"
          evidence={stripeEvidence}
          progress={local}
          baseEntry={0.1}
          side="left"
        />
        <SourceNode
          label="Your Database"
          icon="🗄"
          evidence={dbEvidence}
          progress={local}
          baseEntry={0.3}
          side="center"
        />
        <SourceNode
          label="Activity Logs"
          icon="📋"
          evidence={logEvidence}
          progress={local}
          baseEntry={0.5}
          side="right"
        />
      </div>

      <motion.p
        style={{ opacity: captionOpacity }}
        className="mt-8 text-center text-sm text-muted-foreground"
      >
        Real data from your systems. Not just what Stripe sees.
      </motion.p>
    </div>
  )
}
