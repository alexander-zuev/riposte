import { createCommand, createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
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
  action: 'ready_for_review' | 'needs_input' | 'ignore' | 'deadline_missed' | 'fail' | 'submitted'
  reason?: string
}

type WorkflowStepError = {
  message: string
  retryable: boolean
  _tag?: string
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

    if (triage.action !== 'continue_to_enrichment') return { disputeCaseId, ...triage }

    await step.do('enrich dispute context', externalStepConfig, async () => {
      const command = createCommand(
        'EnrichDisputeContext',
        { disputeCaseId },
        `workflow:${event.instanceId}:enrich-dispute-context`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('enrich dispute context', result)
    })

    await step.do('collect evidence', externalStepConfig, async () => {
      const command = createCommand(
        'CollectDisputeEvidence',
        { disputeCaseId },
        `workflow:${event.instanceId}:collect-evidence`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('collect evidence', result)
    })

    await step.do('prepare evidence packet', externalStepConfig, async () => {
      const command = createCommand(
        'PrepareEvidencePacket',
        { disputeCaseId },
        `workflow:${event.instanceId}:prepare-evidence-packet`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('prepare evidence packet', result)
    })

    await step.do('review evidence packet', internalStepConfig, async () => {
      const command = createCommand(
        'ReviewEvidencePacket',
        { disputeCaseId },
        `workflow:${event.instanceId}:review-evidence-packet`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('review evidence packet', result)
    })

    const decision = await step.do('decide submission', internalStepConfig, async () => {
      const command = createCommand(
        'DecideDisputeSubmission',
        { disputeCaseId },
        `workflow:${event.instanceId}:decide-submission`,
      )
      const result = await this.deps.services.messageBus().handle(command)
      return unwrapWorkflowStepResult('decide submission', result)
    })

    if (decision.action !== 'submit') return { disputeCaseId, ...decision }

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

    return { disputeCaseId, action: submitted.action }
  }
}

/**
 * Bridges Result contracts to Workflow retry semantics without turning expected Err values into Panic.
 */
export function unwrapWorkflowStepResult<T>(
  step: string,
  result: Result<T, WorkflowStepError>,
): T {
  if (result.isOk()) return result.value

  const { error } = result

  if (error.retryable === true) {
    logger.warn('workflow_step_retryable_error', { step, error })
    throw error
  }

  logger.error('workflow_step_non_retryable_error', { step, error })
  throw new NonRetryableError(error.message, error._tag)
}

export const DisputeAgentWorkflow = Sentry.instrumentWorkflowWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentWorkflowBase,
)
