import { withTracing } from '@posthog/ai/vercel'
import type { LanguageModel } from 'ai'
import type { PostHog } from 'posthog-node'
import { createWorkersAI, type WorkersAI } from 'workers-ai-provider'

const DISPUTE_AGENT_GATEWAY_ID = 'riposte-prod'

/**
 * Active dispute-agent model. `id` is the Workers AI binding identifier sent
 * to the provider; `label` is the popover-friendly short name surfaced to
 * users. Kept together so they can never drift.
 */
export const DISPUTE_AGENT_MODEL = {
  id: '@cf/google/gemma-4-26b-a4b-it',
  label: 'gemma-4-26b',
} as const

export type TracingContext = {
  phClient: PostHog
  /** PostHog person distinct_id. Optional — when unknown, events ship anonymously. */
  distinctId?: string
  /** Groups multi-step LLM calls into one trace in PostHog. Omit for one-off generations. */
  traceId?: string
  /** Free-form metadata for dashboard filtering (mode, productId, disputeCaseId, etc.). */
  properties: Record<string, unknown>
}

/**
 * Build the dispute-agent language model: Workers AI Gemma 4 routed through
 * AI Gateway (cost/cache/logs on the CF side), wrapped in `@posthog/ai` for
 * `$ai_generation` capture on the PostHog side.
 *
 * Chain: Workers AI binding → AI Gateway → PostHog `withTracing` → AI SDK.
 *
 * Cost: AI Gateway computes it automatically and exposes via dashboard + Logs
 * API. PostHog computes `$ai_total_cost_usd` server-side from its own price
 * DB. No client-side override here.
 */
export function createDisputeAgentModel(args: {
  env: Env
  tracing: TracingContext
}): LanguageModel {
  const workersai = createWorkersAI({
    binding: args.env.AI,
    gateway: { id: DISPUTE_AGENT_GATEWAY_ID },
  })

  const model = workersai(DISPUTE_AGENT_MODEL.id as Parameters<WorkersAI>[0])

  return withTracing(model, args.tracing.phClient, {
    posthogDistinctId: args.tracing.distinctId,
    posthogTraceId: args.tracing.traceId,
    posthogProperties: args.tracing.properties,
  })
}
