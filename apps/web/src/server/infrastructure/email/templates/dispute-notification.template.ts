import type { DisputeCaseSnapshot } from '@server/domain/disputes'
import {
  disputeNotificationCopy,
  type DisputeNotificationKind,
} from '@server/infrastructure/notifications/dispute-notification-copy'

import {
  emailButton,
  emailCard,
  emailFooter,
  emailH1,
  emailLogo,
  emailP,
  emailWrapper,
} from './email-design-system'

export type { DisputeNotificationKind }

export function disputeNotificationEmailTemplate(args: {
  appUrl: string
  kind: DisputeNotificationKind
  dispute: DisputeCaseSnapshot
  reason?: string
}) {
  const disputeUrl = `${args.appUrl}/disputes/${args.dispute.id}`
  const copy = disputeNotificationCopy({
    kind: args.kind,
    stripeReason: args.dispute.reason,
    amount: formatAmount(args.dispute.amountMinor, args.dispute.currency),
    completionReason: args.reason,
  })

  return {
    subject: copy.title,
    html: emailWrapper(`
${emailLogo()}
${emailCard(`
              ${emailH1(copy.title)}
              ${emailP(copy.summary)}
              ${emailButton('Open dispute', disputeUrl, 'dispute-notification')}
`)}
${emailFooter()}
    `),
    text: `${copy.title}

${copy.summary}

Open dispute:
${disputeUrl}`,
    tags: ['disputes', `dispute-${args.kind}`],
  }
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100)
}
