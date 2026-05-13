import { createCommand, createLogger, createSentryOptions } from '@riposte/core'
import type { DomainCommand } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import type { MessageBusError } from '@server/application/registry/message-result'
import type { DisputeAgent } from '@server/infrastructure/agents/dispute-agent'
import type { DisputeAgentWorkflowParams } from '@server/infrastructure/agents/dispute-agent-client'
import { createAppDeps, type AppDeps } from '@server/infrastructure/app-deps'
import { AgentWorkflow } from 'agents/workflows'
import type { AgentWorkflowEvent, AgentWorkflowStep } from 'agents/workflows'
import type { Result } from 'better-result'
import { NonRetryableError } from 'cloudflare:workflows'

const logger = createLogger('dispute-agent-workflow')

const internalStepConfig = {
  retries: { limit: 3, delay: '2 seconds', backoff: 'exponential' },
  timeout: '1 minute',
} as const

const externalStepConfig = {
  retries: { limit: 5, delay: '10 seconds', backoff: 'exponential' },
  timeout: '10 minutes',
} as const

type DisputeAgentWorkflowOutput = {
  disputeCaseId: string
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

    const triage = await step.do('triage dispute', internalStepConfig, async () => {
      const command = createCommand(
        'TriageDisputeCase',
        { disputeCaseId },
        `workflow:${event.instanceId}:triage-dispute`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('triage dispute', result)
    })

    if (triage.action !== 'contest') return { disputeCaseId }

    await step.do('enrich dispute context', externalStepConfig, async () => {
      const command = createCommand(
        'EnrichDisputeContext',
        { disputeCaseId },
        `workflow:${event.instanceId}:enrich-dispute-context`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('enrich dispute context', result)
    })

    const collected = await step.do('collect evidence', externalStepConfig, async () => {
      const command = createCommand(
        'CollectDisputeEvidence',
        { disputeCaseId },
        `workflow:${event.instanceId}:collect-evidence`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('collect evidence', result)
    })

    if (collected.action !== 'collected') return { disputeCaseId }

    const packet = await step.do('generate evidence packet', externalStepConfig, async () => {
      const command = createCommand(
        'GenerateEvidencePacket',
        { disputeCaseId },
        `workflow:${event.instanceId}:generate-evidence-packet`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('generate evidence packet', result)
    })

    if (packet.action !== 'generated') return { disputeCaseId }

    const route = await step.do('route submission policy', internalStepConfig, async () => {
      const command = createCommand(
        'RouteDisputeSubmissionPolicy',
        { disputeCaseId, evidencePacketId: packet.evidencePacketId },
        `workflow:${event.instanceId}:route-submission-policy`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('route submission policy', result)
    })

    if (route.action !== 'submit') return { disputeCaseId }

    const submitted = await step.do('submit dispute response', externalStepConfig, async () => {
      const command = createCommand(
        'SubmitDisputeResponse',
        { disputeCaseId },
        `workflow:${event.instanceId}:submit-dispute-response`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('submit dispute response', result)
    })

    logger.info('dispute_agent_workflow_completed', {
      action: submitted.action,
      disputeCaseId,
      instanceId: event.instanceId,
    })

    return { disputeCaseId }
  }
}

/**
 * Bridges Result contracts to Workflow retry semantics without turning expected Err values into Panic.
 */
export function unwrapWorkflowStepResult<T>(
  step: string,
  result: Result<T, MessageBusError<DomainCommand>>,
): T {
  if (result.isOk()) return result.value

  const { error } = result

  if (error.retryable === true) {
    logger.warn('workflow_step_retryable_error', { step, error })
    throw error
  }

  logger.error('workflow_step_non_retryable_error', { step, error })
  throw new NonRetryableError(error.message)
}

export const DisputeAgentWorkflow = Sentry.instrumentWorkflowWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentWorkflowBase,
)
