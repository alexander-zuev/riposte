import {
  ArrowClockwiseIcon,
  BellIcon,
  DatabaseIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { connectionsQueries } from '@web/entities/connections'
import { useNotificationChannelToggleMutation } from '@web/pages/authed/settings/hooks/use-notification-channel-toggle-mutation'
import { useSlackOAuthMutation } from '@web/pages/authed/settings/hooks/use-slack-oauth-mutation'
import { useStripeOAuthMutation } from '@web/pages/authed/settings/hooks/use-stripe-oauth-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
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
import { Switch } from '@web/ui/components/ui/switch'
import { useCallback, type ComponentProps, type ComponentType } from 'react'

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
  const isStripeRevoked = stripeConnection?.status === 'revoked'
  const stripeOAuthMutation = useStripeOAuthMutation()
  const slackOAuthMutation = useSlackOAuthMutation()
  const notificationToggleMutation = useNotificationChannelToggleMutation()
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
                  isRevoked={isStripeRevoked}
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
              {connectionsQuery.isError && (
                <p className="text-sm text-destructive-muted-foreground">
                  Could not load Stripe connection status
                </p>
              )}
            </CardContent>
          </Card>

          <NotificationsCard
            isLoading={connectionsQuery.isLoading}
            isError={connectionsQuery.isError}
            channels={connectionsQuery.data?.notifications.channels ?? []}
            isSlackPending={slackOAuthMutation.isPending}
            isTogglePending={notificationToggleMutation.isPending}
            onConnectSlack={() => slackOAuthMutation.mutate()}
            onToggle={(channel, enabled) => notificationToggleMutation.mutate({ channel, enabled })}
          />

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
  isRevoked,
}: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
  isRevoked: boolean
}) {
  if (isLoading) return <Badge variant="secondary">Loading</Badge>
  if (isError) return <Badge variant="destructive">Error</Badge>
  if (isConnected) return <Badge variant="success">Connected</Badge>
  if (isRevoked) return <Badge variant="warning">App uninstalled</Badge>

  return <Badge variant="warning">Needs connection</Badge>
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
        {Icon && (
          <Icon data-icon="inline-start" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
        )}
      </span>
      <span>{label}</span>
      <span className="size-4" aria-hidden="true" />
    </span>
  )
}

function getConnectionItems(input: {
  isLoading: boolean
  isError: boolean
  appDatabaseStatus?: 'not_connected'
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

function NotificationsCard({
  isLoading,
  isError,
  channels,
  isSlackPending,
  isTogglePending,
  onConnectSlack,
  onToggle,
}: {
  isLoading: boolean
  isError: boolean
  channels: Array<{
    channel: 'email' | 'slack'
    health: 'connected' | 'not_connected' | 'failed'
    enabled: boolean
    label: string
    detail: string | null
    failureReason: string | null
  }>
  isSlackPending: boolean
  isTogglePending: boolean
  onConnectSlack: () => void
  onToggle: (channel: 'email' | 'slack', enabled: boolean) => void
}) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-4 text-muted-foreground" />
            Notifications
          </CardTitle>
          <CardDescription>Dispute intake and workflow result notifications</CardDescription>
        </div>
        <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
          <Badge variant={isError ? 'destructive' : 'secondary'}>
            {isLoading ? 'Loading' : isError ? 'Error' : 'Configured'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {channels.map((channel) => (
          <div
            key={channel.channel}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{channel.label}</span>
                <NotificationHealthBadge health={channel.health} />
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {channel.failureReason ?? channel.detail ?? 'Not connected'}
              </p>
            </div>
            {channel.channel === 'slack' && channel.health !== 'connected' ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isSlackPending || isLoading}
                onClick={onConnectSlack}
              >
                {isSlackPending ? 'Connecting' : 'Connect'}
              </Button>
            ) : (
              <Switch
                size="sm"
                checked={channel.enabled}
                disabled={isTogglePending || isLoading || channel.health !== 'connected'}
                onCheckedChange={(checked) => onToggle(channel.channel, checked)}
                aria-label={`${channel.label} notifications`}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function NotificationHealthBadge({ health }: { health: 'connected' | 'not_connected' | 'failed' }) {
  switch (health) {
    case 'connected':
      return <Badge variant="success">Connected</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'not_connected':
      return <Badge variant="warning">Needs connection</Badge>
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
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
