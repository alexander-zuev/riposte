import { safeParseJSON } from '@ai-sdk/provider-utils'
import { createLogger } from '@riposte/core'
import { createToolRepairModel } from '@server/infrastructure/ai/model-factory'
import {
  generateText,
  InvalidToolInputError,
  jsonSchema,
  NoSuchToolError,
  Output,
  type ToolCallRepairFunction,
  type ToolSet,
} from 'ai'
import { Result } from 'better-result'
import { jsonrepair } from 'jsonrepair'

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
 * Strategy:
 * - `NoSuchToolError` (model invented a tool name): redirect to the
 *   `reportUnknownTool` fallback. Its execute returns the error as a tool
 *   result so the model sees what went wrong and picks a real tool next step,
 *   instead of crashing the stream.
 * - `InvalidToolInputError`: structured-output repair via a stronger model
 *   (Kimi K2.6). Ask Kimi to regenerate inputs constrained to the same schema
 *   and substitute them. If Kimi can't produce something valid (or itself
 *   errors), return `null` so the original error bubbles to the chat error
 *   banner.
 */
export function buildDisputeAgentToolCallRepair<T extends ToolSet>(
  ctx: RepairContext,
): ToolCallRepairFunction<T> {
  return async ({ toolCall, tools, inputSchema, error }) => {
    if (NoSuchToolError.isInstance(error)) {
      logger.info('tool_call_redirected_to_unknown_tool_fallback', {
        attemptedToolName: toolCall.toolName,
        mode: ctx.mode,
        productId: ctx.productId,
        requestId: ctx.requestId,
      })
      return {
        ...toolCall,
        toolName: 'reportUnknownTool',
        input: JSON.stringify({
          attemptedToolName: toolCall.toolName,
          availableTools: error.availableTools ?? [],
        }),
      }
    }

    if (InvalidToolInputError.isInstance(error)) {
      // Fast path: many `InvalidToolInputError`s are pure JSON syntax noise
      // (trailing commas, single quotes, unescaped strings). `jsonrepair`
      // fixes those locally; we re-validate against the tool's schema to
      // confirm the structure actually matches before returning (the SDK
      // re-runs `doParseToolCall` on our return value and would silently
      // drop us to an invalid tool-call if validation fails again — no
      // second chance at the LLM). Any failure here falls through to the
      // slow path.
      //
      // Note: we pass `tool.inputSchema` (the original Zod schema) directly,
      // not `jsonSchema(await inputSchema({ toolName }))`. The latter
      // produces a Schema with no `validate` function, which makes
      // `safeValidateTypes` a no-op (provider-utils dist/index.mjs:2216).
      const tool = tools[toolCall.toolName]
      try {
        // Tool always exists at this point — InvalidToolInputError means the
        // call resolved to a real tool but the input failed validation.
        // The optional chain is just type-narrowing for `tools[string]`.
        if (!tool) throw new Error('tool not found in registry')
        const repairedStr = jsonrepair(toolCall.input)
        const parsed = await safeParseJSON({
          text: repairedStr,
          schema: tool.inputSchema,
        })
        if (parsed.success) {
          logger.info('tool_call_repaired_via_jsonrepair', {
            toolName: toolCall.toolName,
            mode: ctx.mode,
            productId: ctx.productId,
            requestId: ctx.requestId,
          })
          return { ...toolCall, input: JSON.stringify(parsed.value) }
        }
        logger.info('tool_call_jsonrepair_skipped', {
          reason: 'schema_mismatch',
          toolName: toolCall.toolName,
          schemaError: parsed.error.message,
          mode: ctx.mode,
          productId: ctx.productId,
          requestId: ctx.requestId,
        })
      } catch (jsonRepairError) {
        // jsonrepair throws when the input is unrecoverable; fall through.
        logger.info('tool_call_jsonrepair_skipped', {
          reason: 'jsonrepair_threw',
          toolName: toolCall.toolName,
          error:
            jsonRepairError instanceof Error ? jsonRepairError.message : String(jsonRepairError),
          mode: ctx.mode,
          productId: ctx.productId,
          requestId: ctx.requestId,
        })
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

    // Defensive: the SDK type contract is `NoSuchToolError | InvalidToolInputError`,
    // so this is unreachable today. If the SDK widens the union in a future
    // version, surface it instead of silently returning null with no signal.
    const unhandled: unknown = error
    logger.error('tool_call_repair_unhandled_error', {
      toolName: toolCall.toolName,
      errorName: unhandled instanceof Error ? unhandled.name : typeof unhandled,
      error: unhandled,
      mode: ctx.mode,
      productId: ctx.productId,
      requestId: ctx.requestId,
    })
    return null
  }
}
