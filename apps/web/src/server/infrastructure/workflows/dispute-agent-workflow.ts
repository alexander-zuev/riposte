import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import type { DisputeAgent } from '@server/infrastructure/agents/dispute-agent'
import type { DisputeAgentWorkflowParams } from '@server/infrastructure/agents/dispute-agent-client'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import { AgentWorkflow } from 'agents/workflows'
import type { AgentWorkflowEvent, AgentWorkflowStep } from 'agents/workflows'

const logger = createLogger('dispute-agent-workflow')

class DisputeAgentWorkflowBase extends AgentWorkflow<DisputeAgent, DisputeAgentWorkflowParams> {
  private readonly deps: AppDeps

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.deps = createAppDeps(env, ctx)
  }

  async run(
    event: AgentWorkflowEvent<DisputeAgentWorkflowParams>,
    step: AgentWorkflowStep,
  ): Promise<{ disputeCaseId: string; status: 'stubbed' }> {
    return await step.do('record workflow start', async () => {
      logger.info('dispute_agent_workflow_started', {
        disputeCaseId: event.payload.disputeCaseId,
        instanceId: event.instanceId,
      })

      return {
        disputeCaseId: event.payload.disputeCaseId,
        status: 'stubbed' as const,
      }
    })
  }
}

export const DisputeAgentWorkflow = Sentry.instrumentWorkflowWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentWorkflowBase,
)
