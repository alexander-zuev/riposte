import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { McpServerCard } from '@web/features/connections/mcp-servers/mcp-server-card'
import type { McpServerEntry } from '@web/features/connections/mcp-servers/mcp-server.types'
import { McpServersSection } from '@web/features/connections/mcp-servers/mcp-servers-section'
import { RemoveMcpServerDialog } from '@web/features/connections/mcp-servers/remove-mcp-server-dialog'

function entry(
  overrides: Partial<McpServerEntry> & Pick<McpServerEntry, 'id' | 'name'>,
): McpServerEntry {
  return {
    serverUrl: 'https://mcp.example.com',
    status: 'ready',
    toolCount: 8,
    error: null,
    authUrl: null,
    ...overrides,
  }
}

const READY = entry({
  id: 'primary-db',
  name: 'primary_db',
  serverUrl: 'https://db.acme.com/mcp',
  status: 'ready',
  toolCount: 12,
})

const AUTHENTICATING = entry({
  id: 'support-tool',
  name: 'support_tool',
  serverUrl: 'https://support.acme.com/mcp',
  status: 'authenticating',
  toolCount: 0,
  authUrl: 'https://auth.example.com/oauth/authorize',
})

const FAILED = entry({
  id: 'usage-db',
  name: 'usage_db',
  serverUrl: 'https://usage.acme.com/mcp',
  status: 'failed',
  toolCount: 0,
  error: 'Connection refused after 3 attempts',
  authUrl: 'https://auth.example.com/oauth/authorize',
})

const CONNECTING = entry({
  id: 'analytics',
  name: 'analytics',
  serverUrl: 'https://analytics.acme.com/mcp',
  status: 'connecting',
  toolCount: 0,
})

const DISCOVERING = entry({
  id: 'billing',
  name: 'billing_ledger',
  serverUrl: 'https://billing.acme.com/mcp',
  status: 'discovering',
  toolCount: 0,
})

const handlers = {
  onReauthenticate: (server: McpServerEntry) => console.info('reauthenticate', server.id),
  onRemove: (server: McpServerEntry) => console.info('remove', server.id),
}

function Showcase({
  connectionState,
  servers,
}: {
  connectionState: 'connecting' | 'ready'
  servers: McpServerEntry[]
}) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 p-8 text-foreground">
      <McpServersSection connectionState={connectionState} servers={servers} {...handlers} />
    </div>
  )
}

const meta: Meta<typeof Showcase> = {
  title: 'Features/Connections/Components/MCP Servers',
  component: Showcase,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof Showcase>

export const Connecting: Story = {
  name: 'Connecting to agent',
  args: { connectionState: 'connecting', servers: [] },
}

export const Empty: Story = {
  name: 'Connected, no servers',
  args: { connectionState: 'ready', servers: [] },
}

export const SingleReady: Story = {
  name: 'Single ready server',
  args: { connectionState: 'ready', servers: [READY] },
}

export const Mixed: Story = {
  name: 'Mixed states',
  args: {
    connectionState: 'ready',
    servers: [READY, AUTHENTICATING, FAILED, CONNECTING, DISCOVERING],
  },
}

export const StressLongNames: Story = {
  name: 'Long names and many servers',
  args: {
    connectionState: 'ready',
    servers: [
      entry({
        id: 'replica',
        name: 'merchant_production_postgres_read_replica_us_east_1',
        serverUrl: 'https://prod-replica.us-east-1.acme-internal.example.com/mcp',
        status: 'ready',
        toolCount: 1,
      }),
      ...Array.from({ length: 5 }, (_, i) =>
        entry({
          id: `svc-${i}`,
          name: `data_source_${i + 1}`,
          serverUrl: `https://svc-${i + 1}.acme.com/mcp`,
          status: 'ready',
          toolCount: (i + 1) * 3,
        }),
      ),
    ],
  },
}

export const RemoveDialog: StoryObj<typeof RemoveMcpServerDialog> = {
  name: 'Remove confirmation dialog',
  render: () => (
    <div className="grid min-h-[420px] place-items-center p-8">
      <RemoveMcpServerDialog
        open
        onOpenChange={(open) => console.info('open change', open)}
        serverName="primary_db"
        onConfirm={() => console.info('confirm remove')}
      />
    </div>
  ),
}

export const SingleCard: StoryObj<typeof McpServerCard> = {
  name: 'Single card (failed, reconnectable)',
  render: () => (
    <div className="mx-auto max-w-md p-8 text-foreground">
      <McpServerCard server={FAILED} {...handlers} />
    </div>
  ),
}
