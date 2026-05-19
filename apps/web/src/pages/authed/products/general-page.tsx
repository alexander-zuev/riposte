import { IdentificationCardIcon, WarningIcon } from '@phosphor-icons/react'
import type { ProductListItem } from '@riposte/core/client'
import { useUpdateProductMutation } from '@web/entities/products/product-mutations'
import { DeleteProductDialog } from '@web/features/products/delete-product-dialog'
import { ProductForm } from '@web/features/products/product-form'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Alert, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Separator } from '@web/ui/components/ui/separator'

type GeneralPageProps = {
  product: ProductListItem
}

export function GeneralPage({ product }: GeneralPageProps) {
  const update = useUpdateProductMutation(product.id)

  return (
    <div className="grid gap-8 text-foreground">
      <PageHeader
        eyebrow="General"
        icon={IdentificationCardIcon}
        title={product.productName}
        description="Product identity and danger zone"
      />

      <ProductForm
        defaults={{
          productName: product.productName,
          url: product.url,
          productType: product.productType,
        }}
        onSubmit={(values) => update.mutate(values)}
        isSubmitting={update.isPending}
        submitLabel="Save changes"
        lockType
      />

      <Separator />

      <DangerZone product={product} />
    </div>
  )
}

function DangerZone({ product }: { product: ProductListItem }) {
  return (
    <Alert
      variant="destructive"
      className="flex max-w-xl flex-row items-center justify-between gap-6 p-4"
    >
      <div className="flex flex-col gap-1">
        <AlertTitle className="flex items-center gap-2 text-base">
          <WarningIcon weight="duotone" />
          Danger zone
        </AlertTitle>
        <AlertDescription>
          Deleting this product also removes its Stripe connections, playbooks, and dispute history.
          This cannot be undone
        </AlertDescription>
      </div>
      <DeleteProductDialog productId={product.id} productName={product.productName} />
    </Alert>
  )
}
