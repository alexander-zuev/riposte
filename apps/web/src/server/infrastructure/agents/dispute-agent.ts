import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { Agent } from 'agents'

const logger = createLogger('dispute-agent')

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
