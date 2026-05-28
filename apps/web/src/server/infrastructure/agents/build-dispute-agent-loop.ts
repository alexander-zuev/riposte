import {
  type LanguageModel,
  type StreamTextOnFinishCallback,
  ToolLoopAgent,
  type ToolSet,
} from 'ai'

import { buildDisputeAgentToolCallRepair } from './dispute-agent.repair'

type ToolLoopAgentOptions = ConstructorParameters<typeof ToolLoopAgent>[0]
type RepairArgs = Parameters<typeof buildDisputeAgentToolCallRepair>[0]

/**
 * Construct a `ToolLoopAgent` configured for the dispute agent's two callers
 * (interactive chat and background evidence collection). Owns the
 * `experimental_repairToolCall` plumbing so callers don't duplicate it.
 *
 * Caller responsibilities:
 * - `prepareStep`, `onStepFinish`, `onFinish` — independent SDK hooks. Each
 *   path uses what it needs. Chat sets `prepareStep` + `onFinish`; evidence
 *   sets `onStepFinish` + a thinner `onFinish`.
 * - Stream consumption — the factory returns the agent; the caller decides
 *   whether to feed it to `toUIMessageStreamResponse` (chat) or `consumeStream`
 *   (evidence).
 */
export type BuildDisputeAgentLoopArgs = {
  id: string
  model: LanguageModel
  instructions: string
  tools: ToolSet
  activeTools: string[]
  repair: RepairArgs
  prepareStep?: ToolLoopAgentOptions['prepareStep']
  onStepFinish?: ToolLoopAgentOptions['onStepFinish']
  onFinish?: StreamTextOnFinishCallback<ToolSet>
  stopWhen?: ToolLoopAgentOptions['stopWhen']
}

/**
 * Conservative frequency penalty on the primary (Gemma) generation to curb its
 * repetition doom loops (e.g. "Wait, I'll just do it." x∞). Kept low on purpose:
 * Gemma also emits structured output (tool-call JSON, SQL) that legitimately
 * repeats tokens, and a high penalty corrupts that — causing *more* tool
 * failures. Tune empirically, one notch at a time. Range -2..2, 0 = off.
 */
const DISPUTE_AGENT_FREQUENCY_PENALTY = 0.2

/**
 * Google's officially recommended Gemma 4 sampling config (model card §1):
 * temperature=1.0, top_p=0.95, top_k=64. Cloudflare Workers AI defaults text
 * generation to temperature 0.6 — below Gemma's intended operating point, where
 * it is known to degenerate into repetition loops. `top_k` is not exposed by the
 * Cloudflare endpoint, so we set the two levers we can.
 * Source: https://ai.google.dev/gemma/docs/core/model_card_4#1_sampling_parameters
 */
const DISPUTE_AGENT_TEMPERATURE = 1.0
const DISPUTE_AGENT_TOP_P = 0.95

export function buildDisputeAgentLoop(args: BuildDisputeAgentLoopArgs): ToolLoopAgent {
  return new ToolLoopAgent({
    id: args.id,
    model: args.model,
    instructions: args.instructions,
    tools: args.tools,
    activeTools: args.activeTools,
    frequencyPenalty: DISPUTE_AGENT_FREQUENCY_PENALTY,
    temperature: DISPUTE_AGENT_TEMPERATURE,
    topP: DISPUTE_AGENT_TOP_P,
    prepareStep: args.prepareStep,
    onStepFinish: args.onStepFinish,
    onFinish: args.onFinish,
    stopWhen: args.stopWhen,
    experimental_repairToolCall: buildDisputeAgentToolCallRepair(args.repair),
  })
}
