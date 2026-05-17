import {
  createCommand,
  createLogger,
  createSentryOptions,
  disputeSubmissionApprovalResponseSchema,
} from '@riposte/core'
import type { DisputeSubmissionApprovalResponse, DomainCommand } from '@riposte/core'
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
const DISPUTE_HUMAN_RESPONSE_EVENT = 'dispute_human_response'
const SUBMISSION_APPROVAL_WAIT_EVENT = {
  type: DISPUTE_HUMAN_RESPONSE_EVENT,
  timeout: '7 days',
} as const

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
    if (!triage.canGenerateEvidencePacket) {
      logger.info('dispute_agent_workflow_waiting_for_human_after_triage', {
        code: triage.code,
        disputeCaseId,
        reason: 'evidence_packet_template_not_supported',
      })

      // TODO: Resume from an explicit human-input domain event instead of ending this run.
      // Triage has already persisted the DisputeCase as awaiting_human with missing evidence.
      return { disputeCaseId }
    }

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

    const submissionDecision = await step.do(
      'decide submission policy',
      internalStepConfig,
      async () => {
        const command = createCommand(
          'DecideDisputeSubmissionPolicy',
          { disputeCaseId, evidencePacketId: packet.evidencePacketId },
          `workflow:${event.instanceId}:decide-submission-policy`,
        )
        const result = await this.deps.services.messageBus().handle(command)
        return unwrapWorkflowStepResult('decide submission policy', result)
      },
    )

    let evidencePacketIdToSubmit: string

    switch (submissionDecision.decision) {
      case 'submit':
        evidencePacketIdToSubmit = submissionDecision.evidencePacketId
        break
      case 'await_human': {
        // The domain has persisted an awaiting-human request. The workflow pauses here until
        // UI/agent sends a matching approval event for this exact packet.
        const approvalEvent = await step.waitForEvent<DisputeSubmissionApprovalResponse>(
          'wait for submission approval',
          SUBMISSION_APPROVAL_WAIT_EVENT,
        )

        const response = await step.do(
          'handle submission approval response',
          internalStepConfig,
          async () => {
            const approvalResponse = parseHitlSubmissionApprovalResponse(approvalEvent.payload)
            const command = createCommand(
              'HandleDisputeSubmissionApprovalResponse',
              { disputeCaseId, approvalResponse },
              `workflow:${event.instanceId}:handle-submission-approval-response`,
            )
            const result = await this.deps.services.messageBus().handle(command)
            return unwrapWorkflowStepResult('handle submission approval response', result)
          },
        )

        if (response.action === 'stop') {
          return { disputeCaseId }
        }
        evidencePacketIdToSubmit = response.evidencePacketId
        break
      }
      default:
        logger.error('dispute_agent_workflow_unknown_submission_policy_decision', {
          disputeCaseId,
          submissionDecision,
        })
        throw new NonRetryableError('Unknown submission policy decision')
    }

    const submitted = await step.do('submit dispute response', externalStepConfig, async () => {
      const command = createCommand(
        'SubmitDisputeResponse',
        { disputeCaseId, evidencePacketId: evidencePacketIdToSubmit },
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

function parseHitlSubmissionApprovalResponse(payload: unknown): DisputeSubmissionApprovalResponse {
  const parsed = disputeSubmissionApprovalResponseSchema.safeParse(payload)
  if (parsed.success) return parsed.data

  logger.error('dispute_agent_workflow_invalid_submission_approval_event', {
    issues: parsed.error.issues,
  })
  throw new NonRetryableError('Invalid submission approval event payload')
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

  if (error.retryable) {
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
