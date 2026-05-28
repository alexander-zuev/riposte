import { createLogger } from '@riposte/core/client'
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
import { useEffect, useMemo } from 'react'

const logger = createLogger('agent-message-part')

type AgentMessagePartProps = {
  part: UIMessage['parts'][number]
  isStreaming: boolean
}

type MessagePartsProps = {
  parts: UIMessage['parts']
  isStreaming?: boolean
}

type KeyedAgentMessagePart = {
  key: string
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

function ToolInputPart({ part }: { part: Extract<UIMessage['parts'][number], { input?: unknown }> }) {
  useEffect(() => {
    if (part.input !== undefined) return
    logger.warn('tool_part_missing_input', {
      type: part.type,
      state: 'state' in part ? part.state : undefined,
      toolCallId: 'toolCallId' in part ? part.toolCallId : undefined,
    })
  }, [part])

  if (part.input === undefined) return null

  return <ToolInput input={part.input} />
}

export function AgentMessagePart({ part, isStreaming }: AgentMessagePartProps) {
  if (part.type === 'step-start') {
    return null
  }

  if (part.type === 'text') {
    return <MessageResponse>{part.text}</MessageResponse>
  }

  if (isReasoningUIPart(part)) {
    return (
      <Reasoning isStreaming={isStreaming && part.state === 'streaming'} defaultOpen={false}>
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
          {part.state !== 'input-streaming' && <ToolInputPart part={part} />}
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

export function MessageParts({ parts, isStreaming = false }: MessagePartsProps) {
  return keyedAgentMessageParts(parts).map(({ key, part }) => (
    <AgentMessagePart key={key} isStreaming={isStreaming} part={part} />
  ))
}

/**
 * Stable identity if the part has one (tool call id, source id, file url, data id),
 * otherwise position. Position is safe because UIMessage parts are append-only in
 * the AI SDK — keying by content would remount text/reasoning on every chunk and
 * collide on every step-start.
 */
export function agentMessagePartKey(part: UIMessage['parts'][number], index: number): string {
  if (isToolUIPart(part)) return `tool:${part.toolCallId}`
  if (part.type === 'source-url' || part.type === 'source-document') {
    return `source:${part.sourceId}`
  }
  if (part.type === 'file') return `file:${part.url}`
  if (isDataUIPart(part) && part.id !== undefined) return `data:${part.type}:${part.id}`
  return `${part.type}:${index}`
}

export function keyedAgentMessageParts(parts: UIMessage['parts']): KeyedAgentMessagePart[] {
  return parts.map((part, index) => ({
    key: agentMessagePartKey(part, index),
    part,
  }))
}
