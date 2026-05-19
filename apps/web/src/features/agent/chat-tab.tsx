import type { AgentMode } from '@web/features/agent/agent-mode'
import type { UseProductSetupResult } from '@web/features/agent/hooks/use-product-setup'
import { OnboardingChatSurface } from '@web/features/agent/onboarding-chat-surface'

type ChatTabProps = {
  mode: AgentMode
  setup: UseProductSetupResult
  productName: string
}

/**
 * Chat tab content. Setup mode → onboarding chat surface (scripted, with
 * inline step actions). Post-setup → empty state pointing at the archived
 * onboarding transcript. Free chat with the agent ships after MVP.
 */
export function ChatTab({ mode, setup, productName }: ChatTabProps) {
  if (mode === 'setup' && setup.status === 'incomplete') {
    return <OnboardingChatSurface productName={productName} state={setup.state} />
  }
  if (mode === 'loading') return null
  return <PostSetupEmpty />
}

function PostSetupEmpty() {
  return (
    <section className="flex flex-col items-center gap-2 border border-dashed bg-surface px-6 py-12 text-center">
      <strong>Setup transcript archived</strong>
      <small className="max-w-md text-muted-foreground">
        Free chat with the agent ships after MVP. The agent runs autonomously per dispute and
        records every step in the activity feed
      </small>
    </section>
  )
}
