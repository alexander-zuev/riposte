import { createLogger } from '@riposte/core'
import { createToolRepairModel } from '@server/infrastructure/ai/model-factory'
import {
  generateText,
  jsonSchema,
  NoSuchToolError,
  Output,
  type ToolCallRepairFunction,
  type ToolSet,
} from 'ai'
import { Result } from 'better-result'

const logger = createLogger('dispute-agent')

type RepairContext = {
  env: Env
  mode: string
  productId: string
  requestId: string | undefined
}

/**
 * Build the `experimental_repairToolCall` callback for the dispute agent.
 *
 * Strategy: structured-output repair via a stronger model (Kimi K2.6). When
 * the primary model emits inputs that fail the tool's schema, ask Kimi to
 * regenerate inputs constrained to the same schema and substitute them. If
 * Kimi can't produce something valid (or itself errors), return `null` so
 * the original error bubbles to the chat error banner.
 *
 * `NoSuchToolError` is not repaired — there's nothing to coerce a missing
 * tool into. We log and let it bubble. If those become common in logs we'll
 * add a synthetic fallback tool that returns the error as a tool result so
 * the loop can continue.
 */
export function buildDisputeAgentToolCallRepair<T extends ToolSet>(
  ctx: RepairContext,
): ToolCallRepairFunction<T> {
  return async ({ toolCall, inputSchema, error }) => {
    if (NoSuchToolError.isInstance(error)) {
      logger.warn('tool_call_repair_skipped', {
        reason: 'no_such_tool',
        toolName: toolCall.toolName,
        mode: ctx.mode,
        productId: ctx.productId,
        requestId: ctx.requestId,
      })
      return null
    }

    logger.info('tool_call_repair_attempted', {
      toolName: toolCall.toolName,
      mode: ctx.mode,
      productId: ctx.productId,
      requestId: ctx.requestId,
    })

    const repaired = await Result.tryPromise({
      try: async () => {
        const schema = await inputSchema({ toolName: toolCall.toolName })
        const { output } = await generateText({
          model: createToolRepairModel({ env: ctx.env }),
          output: Output.object({ schema: jsonSchema(schema) }),
          prompt: [
            `The model tried to call the tool "${toolCall.toolName}" with these inputs:`,
            JSON.stringify(toolCall.input),
            `These inputs failed validation with: ${error.message}`,
            `The tool's required schema is:`,
            JSON.stringify(schema),
            `Return inputs that conform to the schema. Preserve the user's intent — only restructure or rename fields to match the schema shape.`,
          ].join('\n'),
        })
        return output
      },
      catch: (e) => e,
    })

    return repaired.match({
      ok: (repairedInput) => {
        logger.info('tool_call_repair_succeeded', {
          toolName: toolCall.toolName,
          mode: ctx.mode,
          productId: ctx.productId,
          requestId: ctx.requestId,
        })
        return { ...toolCall, input: JSON.stringify(repairedInput) }
      },
      err: (repairError) => {
        logger.warn('tool_call_repair_failed', {
          toolName: toolCall.toolName,
          error: repairError,
          mode: ctx.mode,
          productId: ctx.productId,
          requestId: ctx.requestId,
        })
        return null
      },
    })
  }
}
