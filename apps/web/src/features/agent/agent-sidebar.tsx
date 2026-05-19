import type { AgentMode } from '@web/features/agent/agent-mode'
import type { UseProductSetupResult } from '@web/features/agent/hooks/use-product-setup'
import { OnboardingSidebar } from '@web/features/agent/onboarding-sidebar'
import { QuickActionsSidebar } from '@web/features/agent/quick-actions-sidebar'

type AgentSidebarProps = {
  mode: AgentMode
  setup: UseProductSetupResult
  productId: string
}

/**
 * Right column dispatcher. Setup mode → OnboardingScriptSidebar (six-step
 * script). Post-setup → QuickActionsSidebar (operator shortcuts).
 */
export function AgentSidebar({ mode, setup, productId }: AgentSidebarProps) {
  if (mode === 'loading') return null
  if (mode === 'setup' && setup.status === 'incomplete') {
    return <OnboardingSidebar state={setup.state} />
  }
  return <QuickActionsSidebar productId={productId} />
}
