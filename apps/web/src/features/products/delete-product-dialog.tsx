import { CheckIcon, CopyIcon, TrashIcon } from '@phosphor-icons/react'
import { useDeleteProductMutation } from '@web/entities/products/product-mutations'
import { Button } from '@web/ui/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@web/ui/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import { useEffect, useState } from 'react'

type DeleteProductDialogProps = {
  productId: string
  productName: string
}

export function DeleteProductDialog({ productId, productName }: DeleteProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const mutation = useDeleteProductMutation(productId, productName)

  const canConfirm = typed === productName && !mutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTyped('')
      }}
    >
      <DialogTrigger render={<Button variant="destructive" />}>
        <TrashIcon data-icon="inline-start" />
        Delete product
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete product</DialogTitle>
          <DialogDescription>
            This permanently removes <code>{productName}</code> along with its Stripe connections,
            playbooks, and dispute history. This cannot be undone
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="delete-product-confirm">Type the product name to confirm</FieldLabel>
          <Input
            id="delete-product-confirm"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            disabled={mutation.isPending}
          />
          <FieldDescription className="flex items-center gap-1">
            Must match exactly: <CopyableName name={productName} />
          </FieldDescription>
        </Field>

        <DialogFooter>
          <DialogClose render={<Button variant="secondary" disabled={mutation.isPending} />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" disabled={!canConfirm} onClick={() => mutation.mutate()}>
            Delete product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CopyableName({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <span className="inline-flex items-center gap-1 align-baseline">
      <code>{name}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={copied ? 'Copied' : 'Copy product name'}
        onClick={() => {
          void navigator.clipboard.writeText(name).then(() => setCopied(true))
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </span>
  )
}
