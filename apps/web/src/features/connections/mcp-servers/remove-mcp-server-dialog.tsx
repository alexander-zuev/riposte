import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@web/ui/components/ui/alert-dialog'

type RemoveMcpServerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverName: string
  isRemoving?: boolean
  onConfirm: () => void
}

export function RemoveMcpServerDialog({
  open,
  onOpenChange,
  serverName,
  isRemoving = false,
  onConfirm,
}: RemoveMcpServerDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {serverName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Riposte loses this server&apos;s tools for collecting dispute evidence. Reconnect it
            anytime through the agent
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isRemoving} onClick={onConfirm}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
