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

export function buildDisputeAgentLoop(args: BuildDisputeAgentLoopArgs): ToolLoopAgent {
  return new ToolLoopAgent({
    id: args.id,
    model: args.model,
    instructions: args.instructions,
    tools: args.tools,
    activeTools: args.activeTools,
    prepareStep: args.prepareStep,
    onStepFinish: args.onStepFinish,
    onFinish: args.onFinish,
    stopWhen: args.stopWhen,
    experimental_repairToolCall: buildDisputeAgentToolCallRepair(args.repair),
  })
}
