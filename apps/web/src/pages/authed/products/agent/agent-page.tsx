import { BrainIcon, ChatCircleIcon, PulseIcon } from '@phosphor-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { ActivityTab } from '@web/features/agent/activity-tab'
import { defaultTabFor, deriveAgentMode, subtitleFor } from '@web/features/agent/agent-mode'
import { AgentSidebar } from '@web/features/agent/agent-sidebar'
import { ChatTab } from '@web/features/agent/chat-tab'
import {
  getAgentTransportState,
  useDisputeAgent,
} from '@web/features/agent/hooks/use-dispute-agent-chat'
import { useProductSetup } from '@web/features/agent/hooks/use-product-setup'
import { useStripeConnectedToast } from '@web/features/connections/hooks/use-stripe-connected-toast'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Card, CardAction, CardContent, CardHeader } from '@web/ui/components/ui/card'
import { ConnectionIndicator } from '@web/ui/components/ui/connection-indicator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/components/ui/tabs'

const productRoute = getRouteApi('/_authed/products/$productId')
const agentRoute = getRouteApi('/_authed/products/$productId/agent')

/**
 * /agent — orchestration surface for the per-product agent.
 *
 * Single tabbed card containing Chat | Activity. Connection indicator lives
 * in the card header so it tracks the agent transport regardless of which
 * tab is active. WS lifecycle is owned here and the agent instance is passed
 * down to the chat surface.
 *
 * See dispute-agent-spec.md.
 */
export function AgentPage() {
  const { product } = productRoute.useRouteContext()
  const { stripeConnected } = agentRoute.useSearch()
  const setup = useProductSetup(product.id)
  const mode = deriveAgentMode(setup)
  const agent = useDisputeAgent(product.id)
  const transportState = getAgentTransportState(agent.readyState, agent.identified)

  useStripeConnectedToast({ stripeConnected })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Agent"
        icon={BrainIcon}
        title={product.productName}
        description={subtitleFor(mode, setup)}
      />
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <Tabs defaultValue={defaultTabFor(mode)} className="contents">
            <Card className="flex h-[calc(100vh-16rem)] w-full flex-col gap-0 overflow-hidden py-0 text-sm">
              <CardHeader className="gap-3 border-b border-border px-3 py-2 sm:grid-cols-[1fr_auto]">
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
                <CardAction className="static col-auto row-auto justify-self-end">
                  <ConnectionIndicator state={transportState} />
                </CardAction>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <TabsContent
                  value="chat"
                  className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                >
                  <ChatTab productId={product.id} agent={agent} transportState={transportState} />
                </TabsContent>
                <TabsContent
                  value="activity"
                  className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                >
                  <ActivityTab mode={mode} />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
        <aside className="flex w-70 shrink-0 flex-col gap-4">
          <AgentSidebar mode={mode} setup={setup} productId={product.id} />
        </aside>
      </div>
    </div>
  )
}
