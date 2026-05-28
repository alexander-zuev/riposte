import {
  ArrowClockwiseIcon,
  ChatCircleDotsIcon,
  GearSixIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { CardErrorMessage, Section } from '@web/features/connections/connection-status-card'
import { useStripeConnectedToast } from '@web/features/connections/hooks/use-stripe-connected-toast'
import { RemoveMcpServerDialog } from '@web/features/connections/mcp-servers/remove-mcp-server-dialog'
import {
  useMcpSources,
  type McpSource,
} from '@web/features/connections/mcp-servers/use-mcp-sources'
import { useStripeOAuthMutation } from '@web/pages/authed/connections/hooks/use-stripe-oauth-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@web/ui/components/ui/card'
import { type ComponentProps, useCallback, useState } from 'react'
import { SiModelcontextprotocol as McpIcon, SiStripe as StripeIcon } from 'react-icons/si'

const connectionsRoute = getRouteApi('/_authed/products/$productId/connections')

export function ConnectionsPage() {
  const { productId } = connectionsRoute.useParams()
  const { stripeConnected } = connectionsRoute.useSearch()
  const router = useRouter()
  const connectionsQuery = useQuery(connectionsQueries.status())
  const stripeConnection = connectionsQuery.data?.stripe
  const isStripeConnected = stripeConnection?.status === 'connected'
  const isStripeRevoked = stripeConnection?.status === 'revoked'
  const stripeOAuthMutation = useStripeOAuthMutation()
  const mcpSources = useMcpSources(productId)

  useStripeConnectedToast({ stripeConnected })

  const handleStripeAction = useCallback(() => {
    if (connectionsQuery.isError) {
      connectionsQuery.refetch().catch(() => undefined)
      return
    }

    const redirectAfter = router.buildLocation({
      to: '/products/$productId/connections',
      params: { productId },
    }).href

    stripeOAuthMutation.mutate({ productId, redirectAfter })
  }, [connectionsQuery, stripeOAuthMutation, productId, router])

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Connections"
        description="External systems and policies Riposte uses to handle disputes"
        eyebrow="Connections"
        icon={GearSixIcon}
      />

      <Section
        title="Dispute policy"
        description="Rules for review, approval, and Stripe-facing actions"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              Review before submit
            </CardTitle>
            <CardAction>
              <Badge variant="success">Active</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <small className="text-muted-foreground">
              Approval required before Stripe submission
            </small>
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Stripe"
        description="Account access for disputes, charges, invoices, and customers"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <StripeIcon className="size-4 text-muted-foreground" />
              Stripe
            </CardTitle>
            <CardAction>
              <Badge
                variant={
                  getStripeStatus({
                    isLoading: connectionsQuery.isLoading,
                    isError: connectionsQuery.isError,
                    isConnected: isStripeConnected,
                    isRevoked: isStripeRevoked,
                  }).variant
                }
              >
                {
                  getStripeStatus({
                    isLoading: connectionsQuery.isLoading,
                    isError: connectionsQuery.isError,
                    isConnected: isStripeConnected,
                    isRevoked: isStripeRevoked,
                  }).label
                }
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            {isStripeConnected ? (
              <small className="text-muted-foreground">
                {[
                  stripeConnection.connection.stripeBusinessName,
                  stripeConnection.connection.stripeAccountId,
                  stripeConnection.connection.livemode ? 'Live mode' : 'Test mode',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            ) : (
              <span />
            )}
            <Button
              type="button"
              size="sm"
              variant={isStripeConnected ? 'secondary' : 'default'}
              disabled={stripeOAuthMutation.isPending || connectionsQuery.isLoading}
              onClick={handleStripeAction}
            >
              {stripeOAuthMutation.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : isStripeConnected ? (
                <ArrowClockwiseIcon data-icon="inline-start" />
              ) : null}
              {getStripeActionLabel({
                isLoading: connectionsQuery.isLoading,
                isError: connectionsQuery.isError,
                isConnected: isStripeConnected,
                isRevoked: isStripeRevoked,
              })}
            </Button>
          </CardContent>
          {connectionsQuery.isError ? (
            <CardContent>
              <CardErrorMessage message="Could not load Stripe connection status" />
            </CardContent>
          ) : stripeOAuthMutation.isError ? (
            <CardContent>
              <CardErrorMessage message="Could not start Stripe connection. Try again" />
            </CardContent>
          ) : null}
        </Card>
      </Section>

      <Section
        title="MCP servers"
        description="Data sources the agent connects to collect dispute evidence"
      >
        <McpServersBody productId={productId} mcpSources={mcpSources} />
      </Section>
    </div>
  )
}

function McpServersBody({
  productId,
  mcpSources,
}: {
  productId: string
  mcpSources: ReturnType<typeof useMcpSources>
}) {
  if (mcpSources.isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <SpinnerIcon className="size-5 animate-spin" />
          <small>Loading data sources</small>
        </CardContent>
      </Card>
    )
  }

  if (mcpSources.sources.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <McpIcon className="size-5" />
          <small>No MCP servers connected</small>
          <Button
            variant="secondary"
            size="sm"
            nativeButton={false}
            render={<Link to="/products/$productId/agent" params={{ productId }} />}
          >
            <ChatCircleDotsIcon data-icon="inline-start" />
            Set up in chat
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {mcpSources.sources.map((source) => (
        <McpSourceCard
          key={source.id}
          source={source}
          onRemove={() => mcpSources.disconnect(source)}
          isRemoving={mcpSources.isDisconnecting(source.mcpServerId)}
        />
      ))}
    </div>
  )
}

function McpSourceCard({
  source,
  onRemove,
  isRemoving,
}: {
  source: McpSource
  onRemove: () => void
  isRemoving: boolean
}) {
  const [removeOpen, setRemoveOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          <McpIcon className="size-4 text-muted-foreground" />
          {source.alias}
        </CardTitle>
        <CardAction>
          <Badge variant="success">Connected</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <small className="text-muted-foreground">
          Connected {new Date(source.createdAt).toLocaleDateString()}
        </small>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={isRemoving}
          onClick={() => setRemoveOpen(true)}
        >
          <TrashIcon data-icon="inline-start" />
          Remove
        </Button>
      </CardContent>
      <RemoveMcpServerDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        serverName={source.alias}
        isRemoving={isRemoving}
        onConfirm={() => {
          onRemove()
          setRemoveOpen(false)
        }}
      />
    </Card>
  )
}

function getStripeStatus(input: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
  isRevoked: boolean
}): { variant: ComponentProps<typeof Badge>['variant']; label: string } {
  if (input.isLoading) return { variant: 'secondary', label: 'Loading' }
  if (input.isError) return { variant: 'destructive', label: 'Unavailable' }
  if (input.isConnected) return { variant: 'success', label: 'Connected' }
  if (input.isRevoked) return { variant: 'destructive', label: 'App uninstalled' }

  return { variant: 'warning', label: 'Not connected' }
}

function getStripeActionLabel(input: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
  isRevoked: boolean
}) {
  if (input.isLoading) return 'Loading status'
  if (input.isError) return 'Try again'
  if (input.isConnected) return 'Reconnect'
  if (input.isRevoked) return 'Connect again'

  return 'Connect to Stripe'
}
