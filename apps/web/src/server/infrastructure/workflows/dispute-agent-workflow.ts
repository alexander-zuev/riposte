import { createCommand, createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import type { DisputeAgent } from '@server/infrastructure/agents/dispute-agent'
import type { DisputeAgentWorkflowParams } from '@server/infrastructure/agents/dispute-agent-client'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import { AgentWorkflow } from 'agents/workflows'
import type { AgentWorkflowEvent, AgentWorkflowStep } from 'agents/workflows'

const logger = createLogger('dispute-agent-workflow')

type DisputeAgentWorkflowOutput = {
  disputeCaseId: string
  action: 'ready_for_review' | 'needs_input' | 'ignore' | 'fail' | 'submitted'
  reason?: string
}

class DisputeAgentWorkflowBase extends AgentWorkflow<DisputeAgent, DisputeAgentWorkflowParams> {
  private readonly deps: AppDeps

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.deps = createAppDeps(env, ctx)
  }

  async run(
    event: AgentWorkflowEvent<DisputeAgentWorkflowParams>,
    step: AgentWorkflowStep,
  ): Promise<DisputeAgentWorkflowOutput> {
    const { disputeCaseId } = event.payload

    await step.do('enrich dispute context', async () => {
      const command = createCommand(
        'EnrichDisputeContext',
        { disputeCaseId },
        `workflow:${event.instanceId}:enrich-dispute-context`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    await step.do('collect evidence', async () => {
      const command = createCommand(
        'CollectDisputeEvidence',
        { disputeCaseId },
        `workflow:${event.instanceId}:collect-evidence`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    await step.do('prepare evidence packet', async () => {
      const command = createCommand(
        'PrepareEvidencePacket',
        { disputeCaseId },
        `workflow:${event.instanceId}:prepare-evidence-packet`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    await step.do('review evidence packet', async () => {
      const command = createCommand(
        'ReviewEvidencePacket',
        { disputeCaseId },
        `workflow:${event.instanceId}:review-evidence-packet`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    const decision = await step.do('decide submission', async () => {
      const command = createCommand(
        'DecideDisputeSubmission',
        { disputeCaseId },
        `workflow:${event.instanceId}:decide-submission`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    if (decision.action !== 'submit') return { disputeCaseId, ...decision }

    const submitted = await step.do('submit dispute response', async () => {
      const command = createCommand(
        'SubmitDisputeResponse',
        { disputeCaseId },
        `workflow:${event.instanceId}:submit-dispute-response`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      if (result.isErr()) throw result.error

      return result.value
    })

    logger.info('dispute_agent_workflow_completed', {
      action: submitted.action,
      disputeCaseId,
      instanceId: event.instanceId,
    })

    return { disputeCaseId, action: submitted.action }
  }
}

export const DisputeAgentWorkflow = Sentry.instrumentWorkflowWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentWorkflowBase,
)
