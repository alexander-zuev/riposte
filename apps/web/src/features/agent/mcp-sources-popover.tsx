import { PlugIcon, TrashIcon } from '@phosphor-icons/react'
import { useDisconnectMcpMutation } from '@web/entities/products/product-mutations'
import { cn } from '@web/lib/utils'
import { Button } from '@web/ui/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@web/ui/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@web/ui/components/ui/popover'
import type { MCPServer, MCPServersState } from 'agents'
import { useState } from 'react'

type McpSourcesPopoverProps = {
  mcp: MCPServersState | null
  productId: string
}

type ServerEntry = {
  id: string
  name: string
  state: MCPServer['state']
  error: string | null
  toolCount: number
}

/**
 * MCP Servers readout shown in the prompt-input footer. Push-driven by
 * `onMcpUpdate` (see `useDisputeAgent`). Hidden when no servers are connected
 * so the footer stays quiet during pre-setup.
 *
 * Disconnect lands through the standard mutation + server fn path; the DO
 * cascades PG cleanup via the message bus and broadcasts the new state, so
 * rows disappear without any onSuccess invalidation here.
 */
export function McpSourcesPopover({ mcp, productId }: McpSourcesPopoverProps) {
  if (!mcp) return null
  const servers = collectServers(mcp)
  if (servers.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="sm"
            aria-label={`${servers.length} MCP servers connected`}
          >
            <PlugIcon data-icon="inline-start" weight="duotone" />
            MCP Servers · {servers.length}
          </Button>
        }
      />
      <PopoverContent side="top" align="start" className="w-80 gap-0 p-0 text-xs">
        <PopoverHeader className="border-b border-border px-3 py-2">
          <PopoverTitle className="text-xs">MCP Servers</PopoverTitle>
        </PopoverHeader>
        <ul className="flex flex-col text-xs">
          {servers.map((server) => (
            <li key={server.id}>
              <SourceRow server={server} productId={productId} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function SourceRow({ server, productId }: { server: ServerEntry; productId: string }) {
  const [open, setOpen] = useState(false)
  const mutation = useDisconnectMcpMutation(productId)
  const isReady = server.state === 'ready'

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-foreground">{server.name}</span>
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dotFor(server.state))} />
        {!isReady && (
          <span className="truncate text-muted-foreground">
            {server.state === 'failed' && server.error
              ? `Failed: ${server.error}`
              : STATE_LABELS[server.state]}
          </span>
        )}
      </div>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {isReady ? `${server.toolCount} tools` : '—'}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              aria-label={`Disconnect ${server.name}`}
              disabled={mutation.isPending}
            />
          }
        >
          <TrashIcon weight="duotone" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {server.name}?</DialogTitle>
            <DialogDescription>Tools from this MCP server become unavailable</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" disabled={mutation.isPending} />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate(
                  { mcpServerId: server.id, serverName: server.name },
                  { onSuccess: () => setOpen(false) },
                )
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SourceStatusLine({ server }: { server: ServerEntry }) {
  if (server.state === 'failed') {
    return (
      <span className="truncate text-destructive">
        Failed{server.error ? `: ${server.error}` : ''}
      </span>
    )
  }
  if (server.state === 'ready') return null
  return <span className="text-muted-foreground">{STATE_LABELS[server.state]}</span>
}

const STATE_LABELS: Record<MCPServer['state'], string> = {
  authenticating: 'Authorizing',
  connecting: 'Connecting',
  connected: 'Connected',
  discovering: 'Discovering tools',
  ready: 'Ready',
  failed: 'Failed',
}

function dotFor(state: MCPServer['state']) {
  switch (state) {
    case 'ready':
      return 'bg-success'
    case 'failed':
      return 'bg-destructive'
    case 'authenticating':
    case 'connecting':
    case 'connected':
    case 'discovering':
      return 'bg-warning'
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}

function collectServers(mcp: MCPServersState): ServerEntry[] {
  const toolsByServer = new Map<string, number>()
  for (const tool of mcp.tools) {
    toolsByServer.set(tool.serverId, (toolsByServer.get(tool.serverId) ?? 0) + 1)
  }
  return Object.entries(mcp.servers).map(([id, server]) => ({
    id,
    name: server.name,
    state: server.state,
    error: server.error,
    toolCount: toolsByServer.get(id) ?? 0,
  }))
}
