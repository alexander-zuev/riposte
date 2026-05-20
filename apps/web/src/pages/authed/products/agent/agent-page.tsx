import { BrainIcon, ChatCircleIcon, PulseIcon } from '@phosphor-icons/react'
import type { ProductListItem } from '@riposte/core/client'
import { ActivityTab } from '@web/features/agent/activity-tab'
import { defaultTabFor, deriveAgentMode, subtitleFor } from '@web/features/agent/agent-mode'
import { AgentSidebar } from '@web/features/agent/agent-sidebar'
import { ChatTab } from '@web/features/agent/chat-tab'
import { useProductSetup } from '@web/features/agent/hooks/use-product-setup'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/components/ui/tabs'

type AgentPageProps = {
  product: ProductListItem
}

/**
 * /agent — orchestration surface for the per-product agent.
 *
 * Permanent IA: two-tab shell (Chat | Activity) with a mode-contextual right
 * sidebar. Default tab depends on mode (setup → Chat, post-setup → Activity);
 * both tabs are always enabled. Activity during setup is the audit trail;
 * Chat post-setup carries the archived onboarding transcript.
 *
 * See dispute-agent-spec.md.
 */
export function AgentPage({ product }: AgentPageProps) {
  const setup = useProductSetup(product.id)
  const mode = deriveAgentMode(setup)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Agent"
        icon={BrainIcon}
        title={product.productName}
        description={subtitleFor(mode, setup)}
      />
      <Tabs defaultValue={defaultTabFor(mode)} className="gap-6">
        <TabsList className="self-start">
          <TabsTrigger value="chat">
            <ChatCircleIcon data-icon="inline-start" weight="duotone" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="activity">
            <PulseIcon data-icon="inline-start" weight="duotone" />
            Activity
          </TabsTrigger>
        </TabsList>
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <TabsContent value="chat">
              <ChatTab productId={product.id} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityTab mode={mode} />
            </TabsContent>
          </div>
          <aside className="flex flex-col gap-4">
            <AgentSidebar mode={mode} setup={setup} productId={product.id} />
          </aside>
        </div>
      </Tabs>
    </div>
  )
}
