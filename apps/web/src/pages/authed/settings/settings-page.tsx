import {
  ArrowClockwiseIcon,
  DatabaseIcon,
  EnvelopeIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  SlackLogoIcon,
  SpinnerIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { useNotificationChannelToggleMutation } from '@web/pages/authed/settings/hooks/use-notification-channel-toggle-mutation'
import { useSlackOAuthMutation } from '@web/pages/authed/settings/hooks/use-slack-oauth-mutation'
import { useStripeOAuthMutation } from '@web/pages/authed/settings/hooks/use-stripe-oauth-mutation'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Alert, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
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
import { useCallback, type ComponentProps, type ComponentType, type ReactNode } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']
type ChannelHealth = 'connected' | 'not_connected' | 'failed'

type ConnectionStatus = {
  variant: BadgeVariant
  label: string
}

type NotificationChannelView = {
  channel: 'email' | 'slack'
  health: ChannelHealth
  enabled: boolean
  label: string
  detail: string | null
  failureReason: string | null
}

export function SettingsPage() {
  const { session } = useRouteContext({ from: '/_authed' })
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
  const handleSlackConnect = useCallback(() => {
    slackOAuthMutation.mutate()
  }, [slackOAuthMutation])
  const handleEmailToggle = useCallback(
    (enabled: boolean) => {
      notificationToggleMutation.mutate({ channel: 'email', enabled })
    },
    [notificationToggleMutation],
  )
  const handleSlackToggle = useCallback(
    (enabled: boolean) => {
      notificationToggleMutation.mutate({ channel: 'slack', enabled })
    },
    [notificationToggleMutation],
  )
  const channels = connectionsQuery.data?.notifications.channels ?? []
  const emailChannel = channels.find((channel) => channel.channel === 'email')
  const slackChannel = channels.find((channel) => channel.channel === 'slack')
  const hasReachableChannel = channels.some(
    (channel) => channel.health === 'connected' && channel.enabled,
  )
  const showNoChannelsWarning =
    !connectionsQuery.isLoading && !connectionsQuery.isError && !hasReachableChannel

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Settings"
        description="Configure the systems and policies Riposte uses to handle disputes"
        eyebrow="Settings"
        icon={GearSixIcon}
      />

      <SettingsSection
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
      </SettingsSection>

      <SettingsSection
        title="Connections"
        description="External systems Riposte needs to manage disputes"
      >
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
            {isStripeConnected && (
              <div className="grid gap-1 text-muted-foreground">
                <small>{stripeConnection.connection.stripeBusinessName ?? 'N/A'}</small>
                <small>{stripeConnection.connection.stripeAccountId}</small>
                <small>{stripeConnection.connection.livemode ? 'Live mode' : 'Test mode'}</small>
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
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Dispute intake and workflow result notifications"
      >
        {showNoChannelsWarning && (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertTitle>No notification channels are enabled</AlertTitle>
            <AlertDescription>
              Enable at least one channel below or Riposte will silently complete dispute work
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <EmailChannelCard
            channel={emailChannel}
            email={session.user.email}
            isLoading={connectionsQuery.isLoading}
            isTogglePending={notificationToggleMutation.isPending}
            toggleError={notificationToggleMutation.isError}
            onToggle={handleEmailToggle}
          />
          <SlackChannelCard
            channel={slackChannel}
            isLoading={connectionsQuery.isLoading}
            isSlackPending={slackOAuthMutation.isPending}
            slackError={slackOAuthMutation.isError}
            isTogglePending={notificationToggleMutation.isPending}
            toggleError={notificationToggleMutation.isError}
            onConnect={handleSlackConnect}
            onToggle={handleSlackToggle}
          />
        </div>
      </SettingsSection>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h3>{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function ConnectionStatusCard({
  icon: Icon,
  title,
  description,
  status,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  status: ConnectionStatus | null
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {status && (
          <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  )
}

function CardErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return <small className="text-destructive-muted-foreground">{message}</small>
}

function getStripeStatus(input: {
  isLoading: boolean
  isError: boolean
  isConnected: boolean
  isRevoked: boolean
}): ConnectionStatus | null {
  if (input.isLoading) return null
  if (input.isError) return null
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
        {Icon && (
          <Icon data-icon="inline-start" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
        )}
      </span>
      <span>{label}</span>
      <span className="size-4" aria-hidden="true" />
    </span>
  )
}

function EmailChannelCard({
  channel,
  email,
  isLoading,
  isTogglePending,
  toggleError,
  onToggle,
}: {
  channel: NotificationChannelView | undefined
  email: string
  isLoading: boolean
  isTogglePending: boolean
  toggleError: boolean
  onToggle: (enabled: boolean) => void
}) {
  const enabled = channel?.enabled ?? false

  return (
    <ConnectionStatusCard
      icon={EnvelopeIcon}
      title="Email"
      description="Notifications delivered to your account email"
      status={{ variant: 'success', label: 'Connected' }}
    >
      <div className="flex items-center justify-between gap-3">
        <small className="truncate">
          <span className="text-muted-foreground">Sending to </span>
          <strong>{email}</strong>
        </small>
        <Switch
          checked={enabled}
          disabled={isTogglePending || isLoading || !channel}
          onCheckedChange={onToggle}
          aria-label="Email notifications"
        />
      </div>
      <CardErrorMessage message={toggleError ? 'Could not update email notifications' : null} />
    </ConnectionStatusCard>
  )
}

function SlackChannelCard({
  channel,
  isLoading,
  isSlackPending,
  slackError,
  isTogglePending,
  toggleError,
  onConnect,
  onToggle,
}: {
  channel: NotificationChannelView | undefined
  isLoading: boolean
  isSlackPending: boolean
  slackError: boolean
  isTogglePending: boolean
  toggleError: boolean
  onConnect: () => void
  onToggle: (enabled: boolean) => void
}) {
  const health = channel?.health ?? 'not_connected'
  const isConnected = health === 'connected'
  const status = getSlackStatus(isLoading, health)
  const detail = isConnected ? channel?.detail : (channel?.failureReason ?? 'Not connected')

  return (
    <ConnectionStatusCard
      icon={SlackLogoIcon}
      title="Slack"
      description="Notifications delivered to a Slack workspace channel"
      status={status}
    >
      <div className="flex items-center justify-between gap-3">
        <small className="truncate">
          {isConnected ? (
            <>
              <span className="text-muted-foreground">Sending to </span>
              <strong>{detail ?? '—'}</strong>
            </>
          ) : (
            <span className="text-muted-foreground">{detail ?? '—'}</span>
          )}
        </small>
        {isConnected ? (
          <Switch
            checked={channel?.enabled ?? false}
            disabled={isTogglePending || isLoading}
            onCheckedChange={onToggle}
            aria-label="Slack notifications"
          />
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isSlackPending || isLoading}
            onClick={onConnect}
          >
            {isSlackPending ? 'Connecting' : health === 'failed' ? 'Reconnect' : 'Connect'}
          </Button>
        )}
      </div>
      <CardErrorMessage
        message={
          slackError
            ? 'Could not start Slack connection. Try again'
            : toggleError
              ? 'Could not update Slack notifications'
              : null
        }
      />
    </ConnectionStatusCard>
  )
}

function getSlackStatus(isLoading: boolean, health: ChannelHealth): ConnectionStatus | null {
  if (isLoading) return null
  switch (health) {
    case 'connected':
      return { variant: 'success', label: 'Connected' }
    case 'failed':
      return { variant: 'destructive', label: 'Failed' }
    case 'not_connected':
      return { variant: 'warning', label: 'Not connected' }
    default:
      return { variant: 'secondary', label: 'Unknown' }
  }
}
