import {
  createLogger,
  SlackOAuthCallbackError,
  type DatabaseError,
  type DisputeCaseCompleted,
  type DisputeCaseFailed,
  type DisputeCaseReceived,
  type EmailServiceError,
  type HandleSlackAppUninstalled,
  type HandleSlackOAuthCallback,
  type SetNotificationChannelPreference,
} from '@riposte/core'
import type { HandlerContext } from '@server/application/registry/types'
import { getServerConfig } from '@server/infrastructure/config'
import { exchangeSlackOAuthCode } from '@server/infrastructure/slack/slack-oauth-client'
import { consumeSlackOAuthState } from '@server/infrastructure/slack/slack-oauth-state'
import { Result } from 'better-result'

const logger = createLogger('notification-handler')
const SLACK_DEV_REDIRECT_URI = 'https://tunnel.riposte.sh/api/slack/oauth/callback'

type SlackOAuthHandlerError = DatabaseError | SlackOAuthCallbackError
type NotificationHandlerError = DatabaseError | EmailServiceError

export async function handleSlackOAuthCallback(
  command: HandleSlackOAuthCallback,
  { deps, tx }: HandlerContext,
): Promise<Result<void, SlackOAuthHandlerError>> {
  if (!command.state) {
    return Result.err(new SlackOAuthCallbackError({ reason: 'invalid_state' }))
  }

  const stored = await consumeSlackOAuthState(command.state, deps.kv.auth)
  if (stored.isErr() || !stored.value) {
    logger.warn('slack_oauth_invalid_state', {
      state: command.state,
      error: stored.isErr() ? stored.error : undefined,
    })
    return Result.err(new SlackOAuthCallbackError({ reason: 'invalid_state' }))
  }

  const config = getServerConfig()
  const redirectUri =
    config.mode === 'production'
      ? `${config.appUrl}/api/slack/oauth/callback`
      : SLACK_DEV_REDIRECT_URI

  const token = await exchangeSlackOAuthCode({
    clientId: config.slack.clientId,
    clientSecret: config.slack.clientSecret,
    redirectUri,
    code: command.code,
  })
  if (token.isErr()) return Result.err(token.error)

  const now = new Date()
  const saved = await deps.repos.slackConnections(tx).upsertInstalledConnection({
    userId: stored.value.userId,
    teamId: token.value.teamId,
    teamName: token.value.teamName,
    channelId: token.value.channelId,
    channelName: token.value.channelName,
    webhookUrl: token.value.webhookUrl,
    connectedAt: now,
  })
  if (saved.isErr()) {
    logger.error('slack_oauth_persist_failed', { error: saved.error })
    return Result.err(
      new SlackOAuthCallbackError({
        reason: 'persistence_failed',
        cause: saved.error,
      }),
    )
  }

  const enabled = await deps.repos.notificationPreferences(tx).setChannelEnabled({
    userId: stored.value.userId,
    channel: 'slack',
    enabled: true,
  })
  if (enabled.isErr()) return Result.err(enabled.error)

  logger.info('slack_connection_persisted', {
    slackConnectionId: saved.value.id,
    userId: saved.value.userId,
    teamId: saved.value.teamId,
    channelId: saved.value.channelId,
  })

  return Result.ok(undefined)
}

export async function handleSlackAppUninstalled(
  command: HandleSlackAppUninstalled,
  { deps, tx }: HandlerContext,
): Promise<Result<void, DatabaseError>> {
  const failed = await deps.repos.slackConnections(tx).markFailedByTeamId({
    teamId: command.teamId,
    failureReason: 'app_uninstalled',
    failedAt: new Date(),
  })
  if (failed.isErr()) return Result.err(failed.error)

  logger.info('slack_app_uninstalled', {
    teamId: command.teamId,
    affectedConnections: failed.value.length,
  })

  return Result.ok(undefined)
}

export async function setNotificationChannelPreference(
  command: SetNotificationChannelPreference,
  { deps, tx }: HandlerContext,
): Promise<Result<void, DatabaseError>> {
  const saved = await deps.repos.notificationPreferences(tx).setChannelEnabled({
    userId: command.userId,
    channel: command.channel,
    enabled: command.enabled,
  })
  if (saved.isErr()) return Result.err(saved.error)

  return Result.ok(undefined)
}

export async function notifyOnDisputeCaseReceived(
  event: DisputeCaseReceived,
  { deps, tx }: HandlerContext,
): Promise<Result<void, NotificationHandlerError>> {
  return await deps.services.notifications(tx).notifyDisputeReceived(event)
}

export async function notifyOnDisputeCaseCompleted(
  event: DisputeCaseCompleted,
  { deps, tx }: HandlerContext,
): Promise<Result<void, NotificationHandlerError>> {
  return await deps.services.notifications(tx).notifyDisputeCompleted(event)
}

export async function notifyOnDisputeCaseFailed(
  event: DisputeCaseFailed,
  { deps, tx }: HandlerContext,
): Promise<Result<void, NotificationHandlerError>> {
  return await deps.services.notifications(tx).notifyDisputeFailed(event)
}
