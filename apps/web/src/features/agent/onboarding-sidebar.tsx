import { GaugeIcon } from '@phosphor-icons/react'
import { PRODUCT_SETUP_STEPS, type ProductSetupState } from '@riposte/core/client'
import { deriveStepStatus } from '@web/features/agent/setup-steps'
import { StepChip } from '@web/features/agent/step-chip'
import { Card, CardContent, CardHeader, CardTitle } from '@web/ui/components/ui/card'

type OnboardingSidebarProps = {
  state: ProductSetupState
}

/**
 * Right-column sidebar shown during setup. Mirrors the six-step strip in the
 * dashboard SetupBanner but stacked vertically and scoped to the agent page.
 * Visual language matches the dashboard's Setup health card.
 */
export function OnboardingSidebar({ state }: OnboardingSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GaugeIcon className="size-4 text-muted-foreground" weight="duotone" />
          Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-2">
          {PRODUCT_SETUP_STEPS.map((step) => (
            <li key={step}>
              <StepChip step={step} status={deriveStepStatus(state, step)} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
