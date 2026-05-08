import {
  BellIcon,
  DatabaseIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { unwrapRpc } from '@riposte/core/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { connectionsQueries } from '@web/entities/connections'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { getStripeOAuthUrl } from '@web/server/entrypoints/functions/stripe.fn'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { useCallback, type ComponentProps, type ComponentType } from 'react'
import { toast } from 'sonner'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

type ConnectionItem = {
  label: string
  description: string
  status: string
  variant: BadgeVariant
  icon: ComponentType<{ className?: string }>
  action: string
}

export function SettingsPage() {
  const connectionsQuery = useQuery(connectionsQueries.status())
  const stripeConnection = connectionsQuery.data?.stripe
  const isStripeConnected = stripeConnection?.status === 'connected'
  const stripeOAuthMutation = useMutation({
    mutationFn: async () => unwrapRpc(await getStripeOAuthUrl()),
    onMutate: () => {
      toast.loading('Redirecting to Stripe', { duration: Infinity, id: 'stripe-oauth' })
    },
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.dismiss('stripe-oauth')
      toast.error(error instanceof Error ? error.message : 'Failed to start Stripe connection')
    },
  })
  const handleStripeAction = useCallback(() => {
    if (connectionsQuery.isError) {
      connectionsQuery.refetch().catch(() => undefined)
      return
    }

    stripeOAuthMutation.mutate()
  }, [connectionsQuery, stripeOAuthMutation])
  const connectionItems = getConnectionItems({
    isLoading: connectionsQuery.isLoading,
    isError: connectionsQuery.isError,
    appDatabaseStatus: connectionsQuery.data?.appDatabase.status,
    notificationStatus: connectionsQuery.data?.notifications.status,
    evidenceToolsStatus: connectionsQuery.data?.evidenceTools.status,
  })

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Settings"
        description="Configure the systems and policies Riposte uses to handle disputes"
        eyebrow="Settings"
        icon={GearSixIcon}
      />

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-medium">Connections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            External systems Riposte needs to ingest disputes and build evidence
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlugsConnectedIcon className="size-4 text-muted-foreground" />
                  Stripe
                </CardTitle>
                <CardDescription>
                  Account access for disputes, charges, invoices, and customers
                </CardDescription>
              </div>
              <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
                <StripeStatusBadge
                  isLoading={connectionsQuery.isLoading}
                  isError={connectionsQuery.isError}
                  isConnected={isStripeConnected}
                />
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isStripeConnected && (
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span>{stripeConnection.connection.stripeBusinessName ?? 'N/A'}</span>
                  <span>{stripeConnection.connection.stripeAccountId}</span>
                  <span>{stripeConnection.connection.livemode ? 'Live mode' : 'Test mode'}</span>
                </div>
              )}
              {connectionsQuery.isError && (
                <p className="text-sm text-destructive-muted-foreground">
                  Could not load Stripe connection status
                </p>
              )}
              <Button
                type="button"
                size="lg"
                className="h-12 w-full"
                disabled={stripeOAuthMutation.isPending || connectionsQuery.isLoading}
                onClick={handleStripeAction}
              >
                {stripeOAuthMutation.isPending && <SpinnerIcon className="size-4 animate-spin" />}
                {getStripeActionLabel({
                  isLoading: connectionsQuery.isLoading,
                  isError: connectionsQuery.isError,
                  isConnected: isStripeConnected,
                })}
              </Button>
            </CardContent>
          </Card>

          {connectionItems.map((item) => (
            <ConnectionCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-medium">Autopilot policy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rules for review, approval, and Stripe-facing actions
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                Review before submit
              </CardTitle>
              <CardDescription>
                Riposte prepares dispute evidence, but founder approval is required before Stripe
                submission
              </CardDescription>
            </div>
            <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
              <Badge variant="success">Active</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" size="sm">
              Edit policy
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StripeStatusBadge({
  isLoading,
  isError,
  isConnected,
}: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
}) {
  if (isLoading) return <Badge variant="secondary">Loading</Badge>
  if (isError) return <Badge variant="destructive">Error</Badge>
  if (isConnected) return <Badge variant="success">Connected</Badge>

  return <Badge variant="warning">Needs connection</Badge>
}

function getStripeActionLabel(input: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
}) {
  if (input.isLoading) return 'Loading status'
  if (input.isError) return 'Retry status'
  if (input.isConnected) return 'Reconnect Stripe'

  return 'Connect to Stripe'
}

function getConnectionItems(input: {
  isLoading: boolean
  isError: boolean
  appDatabaseStatus?: 'not_connected'
  notificationStatus?: 'not_configured'
  evidenceToolsStatus?: 'not_defined'
}): ConnectionItem[] {
  return [
    {
      label: 'App database',
      description: 'Read-only Postgres access for customer, usage, and delivery evidence',
      status: getConnectionStatusLabel({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.appDatabaseStatus,
        labels: { not_connected: 'Not connected' },
      }),
      variant: getConnectionStatusVariant({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.appDatabaseStatus,
      }),
      icon: DatabaseIcon,
      action: 'Connect Postgres',
    },
    {
      label: 'Notifications',
      description: 'Escalations and outcome updates for urgent dispute work',
      status: getConnectionStatusLabel({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.notificationStatus,
        labels: { not_configured: 'Not configured' },
      }),
      variant: getConnectionStatusVariant({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.notificationStatus,
      }),
      icon: BellIcon,
      action: 'Configure',
    },
    {
      label: 'Evidence tools',
      description: 'Runtime tools that collect product and customer proof',
      status: getConnectionStatusLabel({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.evidenceToolsStatus,
        labels: { not_defined: 'Not defined' },
      }),
      variant: getConnectionStatusVariant({
        isLoading: input.isLoading,
        isError: input.isError,
        status: input.evidenceToolsStatus,
      }),
      icon: WarningIcon,
      action: 'View requirements',
    },
  ]
}

function getConnectionStatusLabel<TStatus extends string>(input: {
  isLoading: boolean
  isError: boolean
  status?: TStatus
  labels: Record<TStatus, string>
}) {
  if (input.isLoading) return 'Loading'
  if (input.isError) return 'Error'
  if (input.status) return input.labels[input.status]

  return 'Unknown'
}

function getConnectionStatusVariant(input: {
  isLoading: boolean
  isError: boolean
  status?: string
}): BadgeVariant {
  if (input.isError) return 'destructive'
  if (input.isLoading) return 'secondary'

  return 'secondary'
}

function ConnectionCard({ item }: { item: ConnectionItem }) {
  const Icon = item.icon

  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {item.label}
          </CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </div>
        <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
          <Badge variant={item.variant}>{item.status}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" size="sm">
          {item.action}
        </Button>
      </CardContent>
    </Card>
  )
}
