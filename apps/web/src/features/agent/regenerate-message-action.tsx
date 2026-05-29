import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { MessageAction, MessageActions } from '@web/ui/components/ai-elements/message'
import { memo, useCallback } from 'react'

type RegenerateMessageActionProps = {
  messageId: string
  onRegenerate: (id: string) => void
  disabled?: boolean
}

/**
 * Memoized regenerate button shown next to assistant messages. Disabled (not
 * hidden) while the agent is busy so the action row keeps a stable layout.
 * Memo prevents re-renders of older messages when the streaming message updates.
 */
export const RegenerateMessageAction = memo(function RegenerateMessageAction({
  messageId,
  onRegenerate,
  disabled = false,
}: RegenerateMessageActionProps) {
  const handleClick = useCallback(() => onRegenerate(messageId), [messageId, onRegenerate])
  return (
    <MessageActions className="-ms-1.5 -me-1.5">
      <MessageAction tooltip="Try again" disabled={disabled} onClick={handleClick}>
        <ArrowsClockwiseIcon size={16} />
      </MessageAction>
    </MessageActions>
  )
})
