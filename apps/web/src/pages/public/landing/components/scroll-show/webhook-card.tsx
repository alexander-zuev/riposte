import { motion, useTransform, type MotionValue } from 'motion/react'

const webhookLines = [
  { key: 'open', text: '{', color: 'text-muted-foreground', indent: 0 },
  {
    key: 'type',
    text: '"type": "charge.dispute.created",',
    color: 'text-foreground',
    indent: 1,
    highlight: 'text-warning-muted-foreground',
  },
  { key: 'data-open', text: '"data": {', color: 'text-muted-foreground', indent: 1 },
  { key: 'obj-open', text: '"object": {', color: 'text-muted-foreground', indent: 2 },
  { key: 'id', text: '"id": "dp_1R2xK4LkdIwHu7ix",', color: 'text-foreground', indent: 3 },
  {
    key: 'amount',
    text: '"amount": 24900,',
    color: 'text-foreground',
    indent: 3,
    highlight: 'text-destructive-muted-foreground',
  },
  { key: 'currency', text: '"currency": "usd",', color: 'text-muted-foreground', indent: 3 },
  {
    key: 'reason',
    text: '"reason": "fraudulent",',
    color: 'text-foreground',
    indent: 3,
    highlight: 'text-destructive-muted-foreground',
  },
  {
    key: 'status',
    text: '"status": "needs_response",',
    color: 'text-foreground',
    indent: 3,
    highlight: 'text-warning-muted-foreground',
  },
  {
    key: 'evidence-open',
    text: '"evidence_details": {',
    color: 'text-muted-foreground',
    indent: 3,
  },
  {
    key: 'due',
    text: '"due_by": 1687564799,',
    color: 'text-foreground',
    indent: 4,
    highlight: 'text-destructive-muted-foreground',
  },
  {
    key: 'has-evidence',
    text: '"has_evidence": false,',
    color: 'text-foreground',
    indent: 4,
  },
  {
    key: 'submissions',
    text: '"submission_count": 0',
    color: 'text-muted-foreground',
    indent: 4,
  },
  { key: 'evidence-close', text: '}', color: 'text-muted-foreground', indent: 3 },
  { key: 'obj-close', text: '}', color: 'text-muted-foreground', indent: 2 },
  { key: 'data-close', text: '}', color: 'text-muted-foreground', indent: 1 },
  { key: 'close', text: '}', color: 'text-muted-foreground', indent: 0 },
]

interface WebhookCardProps {
  progress: MotionValue<number>
}

export function WebhookCard({ progress }: WebhookCardProps) {
  const totalLines = webhookLines.length

  return (
    <div className="w-full max-w-lg rounded-lg border border-border bg-background shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
        </div>
        <span className="ml-2 text-system text-xs text-muted-foreground">webhook payload</span>
      </div>

      <div className="p-4 text-system text-xs leading-relaxed">
        {webhookLines.map((line, i) => {
          const lineStart = 0.15 + (i / totalLines) * 0.7
          const lineEnd = lineStart + 0.05
          const opacity = useTransform(progress, [lineStart, lineEnd], [0, 1])

          return (
            <motion.div
              key={line.key}
              style={{ opacity, paddingLeft: `${line.indent * 1.25}rem` }}
              className={line.highlight ?? line.color}
            >
              {line.text}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
