import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { MessageAction, MessageActions } from '@web/ui/components/ai-elements/message'
import { memo, useCallback } from 'react'

type RegenerateMessageActionProps = {
  messageId: string
  onRegenerate: (id: string) => void
}

/**
 * Memoized regenerate button shown next to assistant messages when the agent
 * is not actively streaming. Memo prevents re-renders of older messages when
 * the streaming message updates.
 */
export const RegenerateMessageAction = memo(function RegenerateMessageAction({
  messageId,
  onRegenerate,
}: RegenerateMessageActionProps) {
  const handleClick = useCallback(() => onRegenerate(messageId), [messageId, onRegenerate])
  return (
    <MessageActions className="-ms-1.5">
      <MessageAction tooltip="Try again" onClick={handleClick}>
        <ArrowsClockwiseIcon size={16} />
      </MessageAction>
    </MessageActions>
  )
})
