import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useRestartAgentSetup } from '@web/features/agent/hooks/use-restart-agent-setup'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@web/ui/components/ui/alert-dialog'
import { Button } from '@web/ui/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@web/ui/components/ui/tooltip'
import { useState } from 'react'

type RestartSetupButtonProps = {
  productId: string
  connected: boolean
}

/**
 * Restart-setup control for the agent card. Gated on the live agent connection
 * (mirrors the chat input) and guarded by a confirm dialog, since restarting
 * pauses dispute handling until setup is completed again.
 */
export function RestartSetupButton({ productId, connected }: RestartSetupButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { restartSetup, isRestartingSetup } = useRestartAgentSetup({ productId })

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Restart setup"
                  disabled={!connected || isRestartingSetup}
                >
                  <ArrowClockwiseIcon />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="top" align="end">
          Restart setup
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restart setup?</AlertDialogTitle>
          <AlertDialogDescription>
            Restarting clears this product's setup. New disputes won't be handled until you finish
            setup again. For small changes, just chat with the agent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setConfirmOpen(false)
              restartSetup()
            }}
          >
            Restart setup
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
