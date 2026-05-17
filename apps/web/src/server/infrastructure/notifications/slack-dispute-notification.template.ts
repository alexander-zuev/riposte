import type { DisputeCaseSnapshot } from '@server/domain/disputes'
import type { SlackWebhookMessage } from '@server/infrastructure/slack/slack-webhook-notifier'

import { disputeNotificationCopy, type DisputeNotificationKind } from './dispute-notification-copy'

export type SlackDisputeNotificationKind = DisputeNotificationKind

export function slackDisputeNotificationTemplate(args: {
  appUrl: string
  kind: SlackDisputeNotificationKind
  dispute: DisputeCaseSnapshot
  reason?: string
}): SlackWebhookMessage {
  const disputeUrl = `${args.appUrl}/disputes/${args.dispute.id}`
  const copy = disputeNotificationCopy({
    kind: args.kind,
    stripeReason: args.dispute.reason,
    amount: formatAmount(args.dispute.amountMinor, args.dispute.currency),
    completionReason: args.reason,
  })

  return {
    text: copy.title,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${copy.title}*\n${copy.summary} <${disputeUrl}|Open in Riposte>`,
        },
      },
    ],
  }
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100)
}
