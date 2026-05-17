/**
 * Merchant-facing copy for dispute notifications. Maps internal enums
 * (Stripe dispute reasons, DisputeCaseCompletionReason) into short, plain
 * English that doesn't leak codes like `contest_submitted` to operators.
 *
 * Channel-agnostic. Slack and email templates compose layout from these
 * pieces.
 */

export type DisputeNotificationKind = 'received' | 'completed' | 'failed'

export type DisputeNotificationCopy = {
  title: string
  summary: string
}

export function disputeNotificationCopy(input: {
  kind: DisputeNotificationKind
  stripeReason: string
  amount: string
  completionReason?: string
}): DisputeNotificationCopy {
  const context = `${input.amount} ${humanizeStripeReason(input.stripeReason)} dispute`

  switch (input.kind) {
    case 'received':
      return {
        title: 'New dispute received from Stripe',
        summary: `Riposte received a ${context} and started the response workflow.`,
      }
    case 'completed':
      return completedCopy(input.completionReason, context)
    case 'failed':
      return {
        title: 'Action needed — dispute workflow stopped',
        summary: `Riposte couldn't finish processing your ${context}. Open it in Riposte to decide what to do next.`,
      }
    default:
      return {
        title: 'Dispute update',
        summary: `Riposte updated your ${context}.`,
      }
  }
}

function completedCopy(
  completionReason: string | undefined,
  context: string,
): DisputeNotificationCopy {
  switch (completionReason) {
    case 'contest_submitted':
      return {
        title: 'Response submitted to Stripe',
        summary: `Riposte submitted your response to a ${context}. Stripe will issue an outcome once the issuer reviews.`,
      }
    case 'accept_submitted':
      return {
        title: 'Dispute accepted',
        summary: `Riposte accepted your ${context}. No further response will be submitted.`,
      }
    case 'no_response':
      return {
        title: 'Dispute closed — no response submitted',
        summary: `Riposte closed your ${context} without submitting a response.`,
      }
    case 'deadline_missed':
      return {
        title: 'Dispute deadline missed',
        summary: `The Stripe response deadline passed before Riposte could submit your ${context}.`,
      }
    default:
      return {
        title: 'Dispute workflow finished',
        summary: `Riposte finished the workflow on your ${context}.`,
      }
  }
}

function humanizeStripeReason(reason: string): string {
  return reason.replaceAll('_', ' ')
}
