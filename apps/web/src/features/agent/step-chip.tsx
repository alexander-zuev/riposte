import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react'
import type { ProductSetupStep } from '@riposte/core/client'
import { STEP_LABELS, type StepChipStatus } from '@web/features/agent/setup-steps'

type StepChipProps = {
  step: ProductSetupStep
  status: StepChipStatus
}

/**
 * Setup step chip rendered in both the dashboard banner and the agent
 * onboarding sidebar. Status color tokens scope to the icon; chip text uses
 * neutral foreground/muted tokens so semantic colors never leak into copy.
 */
export function StepChip({ step, status }: StepChipProps) {
  if (status === 'done') {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <CheckCircleIcon weight="fill" className="size-4 text-success-muted-foreground" />
        <small>{STEP_LABELS[step]}</small>
      </span>
    )
  }

  if (status === 'active') {
    return (
      <span className="flex items-center gap-1.5 text-foreground">
        <CircleIcon className="size-4" />
        <small className="font-semibold">{STEP_LABELS[step]}</small>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <CircleIcon className="size-4" />
      <small>{STEP_LABELS[step]}</small>
    </span>
  )
}
