import type { UIMessage } from 'ai'

export type DisputeAgentMessageMetadata = {
  createdAt: string
}

export type DisputeAgentMessage = UIMessage<DisputeAgentMessageMetadata>
