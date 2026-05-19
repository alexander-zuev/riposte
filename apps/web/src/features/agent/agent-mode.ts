import type { UseProductSetupResult } from '@web/features/agent/hooks/use-product-setup'
import { STEP_LABELS } from '@web/features/agent/setup-steps'

/**
 * UI-level mode derived from product setup state. Drives default tab, page
 * subtitle, and contextual sidebar selection. Handling mode (in-flight dispute
 * case) is a v1.1 concern and currently folded into `post-setup`.
 */
export type AgentMode = 'loading' | 'setup' | 'post-setup'

export type AgentTabValue = 'chat' | 'activity'

export function deriveAgentMode(setup: UseProductSetupResult): AgentMode {
  if (setup.status === 'loading') return 'loading'
  if (setup.status === 'incomplete') return 'setup'
  return 'post-setup'
}

export function defaultTabFor(mode: AgentMode): AgentTabValue {
  return mode === 'setup' ? 'chat' : 'activity'
}

export function subtitleFor(mode: AgentMode, setup: UseProductSetupResult): string | undefined {
  if (mode === 'loading') return undefined
  if (mode === 'setup' && setup.status === 'incomplete' && setup.state.currentStep) {
    return `Onboarding · ${STEP_LABELS[setup.state.currentStep]}`
  }
  return 'Active · ready to defend'
}
