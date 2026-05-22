import { withTracing } from '@posthog/ai/vercel'
import type { LanguageModel } from 'ai'
import type { PostHog } from 'posthog-node'
import { createWorkersAI, type WorkersAI } from 'workers-ai-provider'

const DISPUTE_AGENT_GATEWAY_ID = 'riposte-prod'

/**
 * Primary dispute-agent model. `id` is the Workers AI binding identifier sent
 * to the provider; `label` is the popover-friendly short name surfaced to
 * users. Kept together so they can never drift.
 */
export const DISPUTE_AGENT_MODEL = {
  id: '@cf/google/gemma-4-26b-a4b-it',
  label: 'gemma-4-26b',
} as const

/**
 * Repair model used by `experimental_repairToolCall` to coerce a malformed
 * tool input into the tool's schema. Frontier-scale, purpose-trained for
 * structured outputs and agentic tool calling — far better at nested MCP
 * schemas than Gemma 4. Only runs on tool-input validation failure, so cost
 * stays bounded.
 */
export const TOOL_REPAIR_MODEL = {
  id: '@cf/moonshotai/kimi-k2.6',
  label: 'kimi-k2.6',
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

type WorkersAIModelId = Parameters<WorkersAI>[0]

/**
 * Build a Workers AI model routed through our AI Gateway. Shared base for
 * every model the dispute agent uses (primary, repair, future fallbacks).
 * Tracing is optional so single-shot calls — like the tool-call repair pass —
 * can skip PostHog instrumentation; outcomes there are logged via dedicated
 * events instead.
 *
 * Cost: AI Gateway computes it and exposes via dashboard + Logs API. When
 * `tracing` is provided, PostHog also computes `$ai_total_cost_usd` from its
 * own price DB. No client-side override.
 *
 * Not exported — call sites should reach for `createDisputeAgentModel` or
 * `createToolRepairModel` so the model choice stays explicit at the boundary.
 */
function createWorkersAIModel(args: {
  env: Env
  modelId: WorkersAIModelId
  tracing?: TracingContext
}): LanguageModel {
  const workersai = createWorkersAI({
    binding: args.env.AI,
    gateway: { id: DISPUTE_AGENT_GATEWAY_ID },
  })

  const model = workersai(args.modelId)

  if (!args.tracing) return model

  return withTracing(model, args.tracing.phClient, {
    posthogDistinctId: args.tracing.distinctId,
    posthogTraceId: args.tracing.traceId,
    posthogProperties: args.tracing.properties,
  })
}

/**
 * Primary dispute-agent model: Gemma 4 with PostHog `$ai_generation` capture.
 * Chain: Workers AI binding → AI Gateway → PostHog `withTracing` → AI SDK.
 */
export function createDisputeAgentModel(args: {
  env: Env
  tracing: TracingContext
}): LanguageModel {
  return createWorkersAIModel({
    env: args.env,
    modelId: DISPUTE_AGENT_MODEL.id as WorkersAIModelId,
    tracing: args.tracing,
  })
}

/**
 * Tool-call repair model: Kimi K2.6 without PostHog tracing. Repair is
 * low-volume and we already log per-attempt outcomes via
 * `tool_call_repair_*` events.
 */
export function createToolRepairModel(args: { env: Env }): LanguageModel {
  return createWorkersAIModel({
    env: args.env,
    modelId: TOOL_REPAIR_MODEL.id as WorkersAIModelId,
  })
}
