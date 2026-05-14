import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { Agent } from 'agents'

const logger = createLogger('dispute-agent')

// TODO(agent): Collect the facts that make Riposte better than Stripe-only evidence:
// - map Stripe customer/payment facts to the merchant's user/account identity
// - prove post-payment product usage for digital goods with source-backed activity events
// - collect product-specific value delivered, such as generated outputs, downloads, API calls, or completed work
// - report missing inputs separately instead of drafting around them
// - produce merchantPosition text only from verified Stripe facts and merchant evidence
class DisputeAgentBase extends Agent<Env> {
  async onWorkflowError(workflowName: string, workflowId: string, error: string): Promise<void> {
    logger.error('workflow_error', {
      error,
      workflowId,
      workflowName,
    })
  }
}

export type DisputeAgent = DisputeAgentBase

export const DisputeAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentBase,
)
