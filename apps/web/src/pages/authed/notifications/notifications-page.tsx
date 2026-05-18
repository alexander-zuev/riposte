import { BellIcon, EnvelopeIcon, SlackLogoIcon, WarningIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { connectionsQueries } from '@web/entities/connections'
import { useNotificationChannelToggleMutation } from '@web/pages/authed/notifications/hooks/use-notification-channel-toggle-mutation'
import { useSlackOAuthMutation } from '@web/pages/authed/notifications/hooks/use-slack-oauth-mutation'
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

export function NotificationsPage() {
  const { session } = useRouteContext({ from: '/_authed' })
  const connectionsQuery = useQuery(connectionsQueries.status())
  const slackOAuthMutation = useSlackOAuthMutation()
  const notificationToggleMutation = useNotificationChannelToggleMutation()

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
        title="Notifications"
        description="Dispute intake and workflow result notifications"
        eyebrow="Workspace"
        icon={BellIcon}
      />

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
    </div>
  )
}

function ChannelCard({
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
    <ChannelCard
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
    </ChannelCard>
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
    <ChannelCard
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
              <strong>{detail ?? '-'}</strong>
            </>
          ) : (
            <span className="text-muted-foreground">{detail ?? '-'}</span>
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
    </ChannelCard>
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
