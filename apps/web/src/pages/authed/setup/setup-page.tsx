import { PlugsConnectedIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

export function SetupPage() {
  return (
    <SurfaceStubPage
      title="Setup"
      description="Agent-driven setup console for product context, connections, evidence tools, and dry-run approval"
      icon={PlugsConnectedIcon}
      sections={[
        {
          title: 'Setup agent',
          description: 'Conversation and activity feed for collecting product-scoped context',
          items: ['Product context', 'Refund and cancellation policy', 'Merchant instructions'],
        },
        {
          title: 'Connections',
          description: 'Durable state for the access Riposte needs before live disputes',
          items: ['Stripe OAuth', 'Read-only app database', 'Notifications'],
        },
        {
          title: 'Dry test',
          description: 'Validation gate before the runtime agent handles live cases',
          items: ['Initial dispute sync', 'Evidence tool mapping', 'Founder approval'],
        },
      ]}
    />
  )
}
