import { ArrowClockwiseIcon, TrashIcon } from '@phosphor-icons/react'
import {
  CardErrorMessage,
  ConnectionStatusCard,
  type ConnectionStatus,
} from '@web/features/connections/connection-status-card'
import type {
  McpServerEntry,
  McpServerStatus,
} from '@web/features/connections/mcp-servers/mcp-server.types'
import { RemoveMcpServerDialog } from '@web/features/connections/mcp-servers/remove-mcp-server-dialog'
import { Button } from '@web/ui/components/ui/button'
import { useState } from 'react'
import { SiModelcontextprotocol as McpIcon } from 'react-icons/si'

type McpServerCardProps = {
  server: McpServerEntry
  onReauthenticate: (server: McpServerEntry) => void
  onRemove: (server: McpServerEntry) => void
  isRemoving?: boolean
}

export function McpServerCard({
  server,
  onReauthenticate,
  onRemove,
  isRemoving = false,
}: McpServerCardProps) {
  const [removeOpen, setRemoveOpen] = useState(false)
  const canReauthenticate =
    server.authUrl !== null && (server.status === 'authenticating' || server.status === 'failed')

  return (
    <ConnectionStatusCard
      icon={McpIcon}
      title={server.name}
      description={hostFromUrl(server.serverUrl)}
      status={getMcpServerStatus(server.status)}
    >
      {detailFor(server) ? (
        <small className="text-muted-foreground">{detailFor(server)}</small>
      ) : null}

      <div className="grid gap-2">
        {canReauthenticate ? (
          <Button
            type="button"
            size="lg"
            variant="default"
            className="w-full"
            onClick={() => onReauthenticate(server)}
          >
            <ArrowClockwiseIcon data-icon="inline-start" />
            {server.status === 'authenticating' ? 'Authorize' : 'Reconnect'}
          </Button>
        ) : null}
        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="w-full"
          disabled={isRemoving}
          onClick={() => setRemoveOpen(true)}
        >
          <TrashIcon data-icon="inline-start" />
          Remove
        </Button>
      </div>

      <CardErrorMessage message={server.status === 'failed' ? server.error : null} />

      <RemoveMcpServerDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        serverName={server.name}
        isRemoving={isRemoving}
        onConfirm={() => {
          onRemove(server)
          setRemoveOpen(false)
        }}
      />
    </ConnectionStatusCard>
  )
}

export function getMcpServerStatus(status: McpServerStatus): ConnectionStatus {
  switch (status) {
    case 'ready':
      return { variant: 'success', label: 'Connected' }
    case 'discovering':
      return { variant: 'secondary', label: 'Discovering' }
    case 'connecting':
    case 'connected':
      return { variant: 'secondary', label: 'Connecting' }
    case 'authenticating':
      return { variant: 'warning', label: 'Authorize' }
    case 'failed':
      return { variant: 'destructive', label: 'Failed' }
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

function detailFor(server: McpServerEntry): string {
  switch (server.status) {
    case 'ready':
      return `${server.toolCount} ${server.toolCount === 1 ? 'tool' : 'tools'}`
    case 'discovering':
      return 'Discovering tools'
    case 'connecting':
    case 'connected':
      return 'Connecting'
    case 'authenticating':
      return 'Authorization required'
    case 'failed':
      return ''
    default: {
      const exhaustive: never = server.status
      return exhaustive
    }
  }
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
