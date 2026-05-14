import type { DisputeCaseSnapshot } from '@server/domain/disputes'

import {
  emailButton,
  emailCard,
  emailFooter,
  emailH1,
  emailLogo,
  emailP,
  emailWrapper,
} from './email-design-system'

export type DisputeNotificationKind = 'received' | 'completed' | 'failed'

export function disputeNotificationEmailTemplate(args: {
  appUrl: string
  kind: DisputeNotificationKind
  dispute: DisputeCaseSnapshot
  reason?: string
}) {
  const disputeUrl = `${args.appUrl}/disputes/${args.dispute.id}`
  const amount = formatAmount(args.dispute.amountMinor, args.dispute.currency)
  const title = getTitle(args.kind)
  const summary = getSummary(args)

  return {
    subject: title,
    html: emailWrapper(`
${emailLogo()}
${emailCard(`
              ${emailH1(title)}
              ${emailP(summary)}
              ${emailP(`Dispute ${args.dispute.id} for ${amount}`)}
              ${emailButton('Open dispute', disputeUrl, 'dispute-notification')}
`)}
${emailFooter()}
    `),
    text: `${title}

${summary}

Dispute ${args.dispute.id} for ${amount}

Open dispute:
${disputeUrl}`,
    tags: ['disputes', `dispute-${args.kind}`],
  }
}

function getTitle(kind: DisputeNotificationKind): string {
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

function getSummary(args: {
  kind: DisputeNotificationKind
  dispute: DisputeCaseSnapshot
  reason?: string
}): string {
  switch (args.kind) {
    case 'received':
      return `Riposte received a ${args.dispute.reason} dispute and started the response workflow.`
    case 'completed':
      return `Riposte finished the dispute workflow: ${args.reason ?? 'completed'}.`
    case 'failed':
      return `Riposte could not finish the dispute workflow: ${args.reason ?? 'failed'}.`
    default:
      return 'Riposte updated a Stripe dispute.'
  }
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100)
}
