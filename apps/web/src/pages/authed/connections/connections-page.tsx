import {
  ArrowClockwiseIcon,
  DatabaseIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useRouter } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import {
  CardErrorMessage,
  ConnectionStatusCard,
  Section,
  type ConnectionStatus,
} from '@web/features/connections/connection-status-card'
import { useStripeConnectedToast } from '@web/features/connections/hooks/use-stripe-connected-toast'
import { useStripeOAuthMutation } from '@web/pages/authed/connections/hooks/use-stripe-oauth-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Button } from '@web/ui/components/ui/button'
import { useCallback } from 'react'

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
        <ConnectionStatusCard
          icon={ShieldCheckIcon}
          title="Review before submit"
          description="Riposte prepares dispute evidence, but founder approval is required before Stripe submission"
          status={{ variant: 'success', label: 'Active' }}
        >
          <div>
            <Button variant="secondary" size="sm">
              Edit policy
            </Button>
          </div>
        </ConnectionStatusCard>
      </Section>

      <Section title="Connections" description="External systems Riposte needs to manage disputes">
        <div className="grid gap-4 lg:grid-cols-2">
          <ConnectionStatusCard
            icon={PlugsConnectedIcon}
            title="Stripe"
            description="Account access for disputes, charges, invoices, and customers"
            status={getStripeStatus({
              isLoading: connectionsQuery.isLoading,
              isError: connectionsQuery.isError,
              isConnected: isStripeConnected,
              isRevoked: isStripeRevoked,
            })}
          >
            <div className="grid gap-1 text-muted-foreground">
              <small>
                {isStripeConnected ? (stripeConnection.connection.stripeBusinessName ?? '—') : '—'}
              </small>
              <small>{isStripeConnected ? stripeConnection.connection.stripeAccountId : '—'}</small>
              <small>
                {isStripeConnected
                  ? stripeConnection.connection.livemode
                    ? 'Live mode'
                    : 'Test mode'
                  : '—'}
              </small>
            </div>
            <Button
              type="button"
              size="lg"
              variant={isStripeConnected ? 'secondary' : 'default'}
              className="w-full"
              disabled={stripeOAuthMutation.isPending || connectionsQuery.isLoading}
              onClick={handleStripeAction}
            >
              <StripeActionContent
                isPending={stripeOAuthMutation.isPending}
                isConnected={isStripeConnected}
                label={getStripeActionLabel({
                  isLoading: connectionsQuery.isLoading,
                  isError: connectionsQuery.isError,
                  isConnected: isStripeConnected,
                  isRevoked: isStripeRevoked,
                })}
              />
            </Button>
            <CardErrorMessage
              message={
                connectionsQuery.isError
                  ? 'Could not load Stripe connection status'
                  : stripeOAuthMutation.isError
                    ? 'Could not start Stripe connection. Try again'
                    : null
              }
            />
          </ConnectionStatusCard>

          <ConnectionStatusCard
            icon={DatabaseIcon}
            title="App database"
            description="Read-only Postgres access for customer, usage, and delivery evidence"
            status={{ variant: 'warning', label: 'Not connected' }}
          >
            <Button type="button" size="lg" className="w-full" disabled>
              Connect Postgres
            </Button>
          </ConnectionStatusCard>

          <ConnectionStatusCard
            icon={WarningIcon}
            title="Evidence tools"
            description="Runtime tools that collect product and customer proof"
            status={{ variant: 'warning', label: 'Not defined' }}
          >
            <Button type="button" size="lg" className="w-full" disabled>
              View requirements
            </Button>
          </ConnectionStatusCard>
        </div>
      </Section>
    </div>
  )
}

function getStripeStatus(input: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
  isRevoked: boolean
}): ConnectionStatus {
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

function StripeActionContent({
  isPending,
  isConnected,
  label,
}: {
  isPending: boolean
  isConnected: boolean
  label: string
}) {
  const Icon = isConnected ? ArrowClockwiseIcon : isPending ? SpinnerIcon : null

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex size-4 items-center justify-center">
        {Icon ? (
          <Icon data-icon="inline-start" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
        ) : (
          <span aria-hidden="true" />
        )}
      </span>
      <span>{label}</span>
      <span className="size-4" aria-hidden="true" />
    </span>
  )
}
