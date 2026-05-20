import { CodeBlock } from '@web/ui/components/ai-elements/code-block'
import { MessageResponse } from '@web/ui/components/ai-elements/message'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@web/ui/components/ai-elements/tool'
import { isDataUIPart, isToolUIPart, type UIMessage } from 'ai'

type AgentMessagePartProps = {
  part: UIMessage['parts'][number]
}

export function AgentMessagePart({ part }: AgentMessagePartProps) {
  if (part.type === 'step-start') {
    return null
  }

  if (part.type === 'text') {
    return <MessageResponse>{part.text}</MessageResponse>
  }

  if (isToolUIPart(part)) {
    return (
      <Tool defaultOpen={part.state === 'output-error'}>
        {part.type === 'dynamic-tool' ? (
          <ToolHeader type="dynamic-tool" state={part.state} toolName={part.toolName} />
        ) : (
          <ToolHeader type={part.type} state={part.state} />
        )}
        <ToolContent>
          {part.state !== 'input-streaming' && <ToolInput input={part.input} />}
          {part.state === 'output-available' && (
            <ToolOutput output={part.output} errorText={undefined} />
          )}
          {part.state === 'output-error' && (
            <ToolOutput output={undefined} errorText={part.errorText} />
          )}
        </ToolContent>
      </Tool>
    )
  }

  return <CodeBlock code={JSON.stringify(part, null, 2)} language="json" />
}

export function agentMessagePartKey(part: UIMessage['parts'][number]): string {
  if (part.type === 'text') return `text:${part.text}`
  if (part.type === 'reasoning') return `reasoning:${part.text}`
  if (isToolUIPart(part)) return `tool:${part.toolCallId}`
  if (part.type === 'source-url' || part.type === 'source-document') {
    return `source:${part.sourceId}`
  }
  if (part.type === 'file') return `file:${part.url}`
  if (part.type === 'step-start') return 'step-start'
  if (isDataUIPart(part)) return `data:${part.type}:${part.id ?? JSON.stringify(part.data)}`
  return `unknown:${JSON.stringify(part)}`
}
