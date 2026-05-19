import { BrainIcon } from '@phosphor-icons/react'
import type { ProductListItem, ProductSetupState } from '@riposte/core/client'
import { useProductSetup } from '@web/features/agent/hooks/use-product-setup'
import { PageHeader } from '@web/pages/authed/shared/page-header'

type AgentPageProps = {
  product: ProductListItem
}

/**
 * /agent — orchestration surface for the per-product agent.
 *
 * Modes (storybook reference, mvp-sketches/ia-recalibration.stories.tsx):
 *  - setup    → scripted onboarding (terminal chat + script actions)
 *  - idle     → activity feed (post-setup, no active dispute)
 *  - handling → workflow timeline + activity feed for an active dispute case
 *
 * Routing source of truth = `productSetupState.currentStep` for setup/idle split.
 * Handling mode arrives when a dispute case is in-flight (later slice).
 */
export function AgentPage({ product }: AgentPageProps) {
  const setup = useProductSetup(product.id)

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        eyebrow="Agent"
        icon={BrainIcon}
        title={product.productName}
        description="Onboard, configure, and operate the dispute agent"
      />
      <AgentBody setup={setup} />
    </div>
  )
}

function AgentBody({ setup }: { setup: ReturnType<typeof useProductSetup> }) {
  if (setup.status === 'loading') return <AgentLoadingView />
  if (setup.status === 'incomplete') return <AgentSetupView setup={setup.state} />
  return <AgentIdleView />
}

function AgentLoadingView() {
  return (
    <section className="border bg-surface p-6">
      <small className="text-muted-foreground">Loading agent state</small>
    </section>
  )
}

// TODO(agent): replace with onboarding script (terminal chat + step actions). See
// storybook AgentOnboarding for layout: completed transcript + active step block.
function AgentSetupView({ setup }: { setup: ProductSetupState }) {
  return (
    <section className="border bg-surface p-6">
      <strong>Setup in progress</strong>
      <small className="mt-2 block text-muted-foreground">Current step: {setup.currentStep}</small>
    </section>
  )
}

// TODO(agent): replace with shared ActivityFeed. See storybook ActivityFeed.
function AgentIdleView() {
  return (
    <section className="border bg-surface p-6">
      <strong>Setup complete</strong>
      <small className="mt-2 block text-muted-foreground">
        No active dispute. Activity feed coming soon
      </small>
    </section>
  )
}
