import { createLogger, uuidv7 } from '@riposte/core'
import type { StepResult, ToolSet, UIMessage } from 'ai'

const logger = createLogger('ai-sdk-ui-message')

export function stepResultToUiMessage(step: StepResult<ToolSet>): {
  id: string
  role: 'assistant'
  parts: UIMessage<never>['parts']
} {
  const parts: UIMessage<never>['parts'] = []

  for (const part of step.content) {
    switch (part.type) {
      case 'text':
        if (part.text.trim()) {
          parts.push({
            type: 'text',
            text: part.text,
            state: 'done',
          })
        }
        break
      case 'reasoning':
        if (part.text.trim()) {
          parts.push({
            type: 'reasoning',
            text: part.text,
            state: 'done',
          })
        }
        break
      case 'tool-call':
        parts.push({
          type: `tool-${part.toolName}`,
          toolCallId: part.toolCallId,
          state: 'input-available',
          input: part.input,
          providerExecuted: part.providerExecuted,
        } as UIMessage<never>['parts'][number])
        break
      case 'tool-result':
        parts.push({
          type: `tool-${part.toolName}`,
          toolCallId: part.toolCallId,
          state: 'output-available',
          input: part.input,
          output: part.output,
          providerExecuted: part.providerExecuted,
        } as UIMessage<never>['parts'][number])
        break
      case 'tool-error':
        parts.push({
          type: `tool-${part.toolName}`,
          toolCallId: part.toolCallId,
          state: 'output-error',
          input: part.input,
          errorText: String(part.error),
          providerExecuted: part.providerExecuted,
        } as UIMessage<never>['parts'][number])
        break
      case 'source':
      case 'file':
      case 'tool-approval-request':
        logger.warn('ai_sdk_step_content_part_skipped', {
          stepNumber: step.stepNumber,
          partType: part.type,
        })
        break
      default:
        logger.warn('ai_sdk_step_content_part_unknown', {
          stepNumber: step.stepNumber,
          partType: Reflect.get(part, 'type'),
        })
        break
    }
  }

  return {
    id: uuidv7(),
    role: 'assistant',
    parts,
  }
}
