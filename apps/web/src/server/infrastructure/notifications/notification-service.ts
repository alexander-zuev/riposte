import type {
  DatabaseError,
  DisputeCaseCompleted,
  DisputeCaseFailed,
  DisputeCaseReceived,
  EmailServiceError,
} from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { DisputeCaseSnapshot } from '@server/domain/disputes'
import type { AppDeps } from '@server/infrastructure/app-deps'
import { getServerConfig } from '@server/infrastructure/config'
import type { DrizzleDb } from '@server/infrastructure/db'
import { disputeNotificationEmailTemplate } from '@server/infrastructure/email/templates/dispute-notification.template'
import { slackDisputeNotificationTemplate } from '@server/infrastructure/notifications/slack-dispute-notification.template'
import { Result } from 'better-result'

const logger = createLogger('notification-service')

type NotificationError = DatabaseError | EmailServiceError

export interface INotificationService {
  notifyDisputeReceived: (event: DisputeCaseReceived) => Promise<Result<void, NotificationError>>
  notifyDisputeCompleted: (event: DisputeCaseCompleted) => Promise<Result<void, NotificationError>>
  notifyDisputeFailed: (event: DisputeCaseFailed) => Promise<Result<void, NotificationError>>
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly deps: AppDeps,
    private readonly tx: DrizzleDb,
  ) {}

  async notifyDisputeReceived(
    event: DisputeCaseReceived,
  ): Promise<Result<void, NotificationError>> {
    return await this.notifyDispute({
      userId: event.userId,
      disputeCaseId: event.disputeCaseId,
      kind: 'received',
    })
  }

  async notifyDisputeCompleted(
    event: DisputeCaseCompleted,
  ): Promise<Result<void, NotificationError>> {
    return await this.notifyDispute({
      userId: event.userId,
      disputeCaseId: event.disputeCaseId,
      kind: 'completed',
      reason: event.reason,
    })
  }

  async notifyDisputeFailed(event: DisputeCaseFailed): Promise<Result<void, NotificationError>> {
    return await this.notifyDispute({
      userId: event.userId,
      disputeCaseId: event.disputeCaseId,
      kind: 'failed',
      reason: event.reason,
    })
  }

  private async notifyDispute(input: {
    userId: string
    disputeCaseId: string
    kind: 'received' | 'completed' | 'failed'
    reason?: string
  }): Promise<Result<void, NotificationError>> {
    const dispute = await this.deps.repos.disputeCases(this.tx).findById(input.disputeCaseId)
    if (dispute.isErr()) return Result.err(dispute.error)
    if (!dispute.value) {
      logger.warn('notification_dispute_missing', { disputeCaseId: input.disputeCaseId })
      return Result.ok(undefined)
    }

    const notificationPreferences = this.deps.repos.notificationPreferences(this.tx)
    const recipient = await notificationPreferences.findRecipientByUserId(input.userId)
    if (recipient.isErr()) return Result.err(recipient.error)
    if (!recipient.value) {
      logger.warn('notification_recipient_missing', { userId: input.userId })
      return Result.ok(undefined)
    }

    const preferences = await notificationPreferences.findForUser(input.userId)
    if (preferences.isErr()) return Result.err(preferences.error)

    const enabled = new Map(
      preferences.value.map((preference) => [preference.channel, preference.enabled]),
    )
    const config = getServerConfig()
    const snapshot = dispute.value.serialize()

    if (enabled.get('email') ?? true) {
      const email = disputeNotificationEmailTemplate({
        appUrl: config.appUrl,
        kind: input.kind,
        dispute: snapshot,
        reason: input.reason,
      })
      const sent = await this.deps.services.email().sendEmail({
        to: recipient.value.email,
        ...email,
      })
      if (sent.isErr()) return Result.err(sent.error)
    }

    if (enabled.get('slack') === true) {
      await this.notifySlack({
        userId: input.userId,
        kind: input.kind,
        dispute: snapshot,
        reason: input.reason,
        appUrl: config.appUrl,
      })
    }

    return Result.ok(undefined)
  }

  private async notifySlack(input: {
    userId: string
    kind: 'received' | 'completed' | 'failed'
    dispute: DisputeCaseSnapshot
    reason?: string
    appUrl: string
  }): Promise<void> {
    const connection = await this.deps.repos
      .slackConnections(this.tx)
      .findWithCredentialsByUserId(input.userId)
    if (connection.isErr()) {
      logger.warn('slack_notification_connection_lookup_failed', { error: connection.error })
      return
    }
    if (!connection.value || connection.value.status !== 'active') return

    const sent = await this.deps.services.slackWebhook().send(
      connection.value.webhookUrl,
      slackDisputeNotificationTemplate({
        appUrl: input.appUrl,
        kind: input.kind,
        dispute: input.dispute,
        reason: input.reason,
      }),
    )
    if (sent.isOk()) return

    logger.warn('slack_notification_send_failed', {
      slackConnectionId: connection.value.id,
      teamId: connection.value.teamId,
      status: sent.error.status,
      retryable: sent.error.retryable,
    })

    if (sent.error.status && sent.error.status < 500) {
      const failed = await this.deps.repos.slackConnections(this.tx).markFailedByTeamId({
        teamId: connection.value.teamId,
        failureReason: `webhook_${sent.error.status}`,
        failedAt: new Date(),
      })
      if (failed.isErr()) {
        logger.warn('slack_notification_mark_failed_failed', { error: failed.error })
      }
    }
  }
}
