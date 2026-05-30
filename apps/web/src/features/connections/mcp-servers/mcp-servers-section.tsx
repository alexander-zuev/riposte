import { Section } from '@web/features/connections/connection-status-card'
import { McpServerCard } from '@web/features/connections/mcp-servers/mcp-server-card'
import type { McpServerEntry } from '@web/features/connections/mcp-servers/mcp-server.types'
import { Card, CardContent } from '@web/ui/components/ui/card'
import { GridLoader } from '@web/ui/components/ui/grid-loader'
import type { ComponentType } from 'react'
import { SiModelcontextprotocol as McpIcon } from 'react-icons/si'

type McpServersSectionProps = {
  connectionState: 'connecting' | 'ready'
  servers: McpServerEntry[]
  onReauthenticate: (server: McpServerEntry) => void
  onRemove: (server: McpServerEntry) => void
  removingServerId?: string | null
}

export function McpServersSection({
  connectionState,
  servers,
  onReauthenticate,
  onRemove,
  removingServerId = null,
}: McpServersSectionProps) {
  return (
    <Section
      title="MCP servers"
      description="Merchant data sources the agent connects to collect dispute evidence"
    >
      <McpServersBody
        connectionState={connectionState}
        servers={servers}
        onReauthenticate={onReauthenticate}
        onRemove={onRemove}
        removingServerId={removingServerId}
      />
    </Section>
  )
}

function McpServersBody({
  connectionState,
  servers,
  onReauthenticate,
  onRemove,
  removingServerId,
}: Required<McpServersSectionProps>) {
  if (connectionState === 'connecting') {
    return <StatusNote icon={GridLoader}>Connecting to the agent</StatusNote>
  }

  if (servers.length === 0) {
    return (
      <StatusNote icon={McpIcon}>
        No MCP servers connected. The agent connects data sources during product setup
      </StatusNote>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {servers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          onReauthenticate={onReauthenticate}
          onRemove={onRemove}
          isRemoving={removingServerId === server.id}
        />
      ))}
    </div>
  )
}

function StatusNote({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  children: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Icon className="size-5" />
        <small>{children}</small>
      </CardContent>
    </Card>
  )
}
