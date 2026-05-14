import type { DisputeCaseSnapshot } from '@server/domain/disputes'
import type { SlackWebhookMessage } from '@server/infrastructure/slack/slack-webhook-notifier'

export type SlackDisputeNotificationKind = 'received' | 'completed' | 'failed'

export function slackDisputeNotificationTemplate(args: {
  appUrl: string
  kind: SlackDisputeNotificationKind
  dispute: DisputeCaseSnapshot
  reason?: string
}): SlackWebhookMessage {
  const title = getTitle(args.kind)
  const disputeUrl = `${args.appUrl}/disputes/${args.dispute.id}`
  const amount = formatAmount(args.dispute.amountMinor, args.dispute.currency)
  const reasonText = args.reason ? `\nReason: ${args.reason}` : ''

  return {
    text: `${title}: ${args.dispute.id}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n<${disputeUrl}|${args.dispute.id}> for ${amount}${reasonText}`,
        },
      },
    ],
  }
}

function getTitle(kind: SlackDisputeNotificationKind): string {
  switch (kind) {
    case 'received':
      return 'New Stripe dispute received'
    case 'completed':
      return 'Stripe dispute completed'
    case 'failed':
      return 'Stripe dispute workflow failed'
    default:
      return 'Stripe dispute update'
  }
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100)
}
