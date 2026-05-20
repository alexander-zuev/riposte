import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from '@web/ui/components/ai-elements/attachments'
import { CodeBlock } from '@web/ui/components/ai-elements/code-block'
import { MessageResponse } from '@web/ui/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@web/ui/components/ai-elements/reasoning'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@web/ui/components/ai-elements/sources'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@web/ui/components/ai-elements/tool'
import { isDataUIPart, isFileUIPart, isReasoningUIPart, isToolUIPart, type UIMessage } from 'ai'
import { useMemo } from 'react'

type AgentMessagePartProps = {
  part: UIMessage['parts'][number]
}

type SourceDocumentPart = Extract<UIMessage['parts'][number], { type: 'source-document' }>
type FilePart = Extract<UIMessage['parts'][number], { type: 'file' }>

function SourceDocumentPartView({ part }: { part: SourceDocumentPart }) {
  const data = useMemo(() => ({ ...part, id: part.sourceId }), [part])

  return (
    <Attachments variant="list">
      <Attachment data={data}>
        <AttachmentPreview />
        <AttachmentInfo showMediaType />
      </Attachment>
    </Attachments>
  )
}

function FilePartView({ part }: { part: FilePart }) {
  const data = useMemo(() => ({ ...part, id: part.url }), [part])

  return (
    <Attachments variant="list">
      <Attachment data={data}>
        <AttachmentPreview />
        <AttachmentInfo showMediaType />
      </Attachment>
    </Attachments>
  )
}

export function AgentMessagePart({ part }: AgentMessagePartProps) {
  if (part.type === 'step-start') {
    return null
  }

  if (part.type === 'text') {
    return <MessageResponse>{part.text}</MessageResponse>
  }

  if (isReasoningUIPart(part)) {
    return (
      <Reasoning isStreaming={part.state === 'streaming'}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    )
  }

  if (part.type === 'source-url') {
    return (
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source href={part.url} title={part.title ?? part.url} />
        </SourcesContent>
      </Sources>
    )
  }

  if (part.type === 'source-document') {
    return <SourceDocumentPartView part={part} />
  }

  if (isFileUIPart(part)) {
    return <FilePartView part={part} />
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
