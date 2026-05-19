import { PackageIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useCreateProductMutation } from '@web/entities/products/product-mutations'
import { ProductForm } from '@web/features/products/product-form'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { buttonVariants } from '@web/ui/components/ui/button'

export function ProductCreatePage() {
  const mutation = useCreateProductMutation()

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="New product"
        description="Add an app you want to protect against Stripe disputes"
        eyebrow="Products"
        icon={PackageIcon}
      />

      <ProductForm
        defaults={{ productName: '', url: '', productType: 'digital_product_or_service' }}
        onSubmit={(values) => mutation.mutate(values)}
        isSubmitting={mutation.isPending}
        submitLabel="Create product"
        cancel={
          <Link
            to="/products"
            className={buttonVariants({ variant: 'secondary' })}
            aria-disabled={mutation.isPending}
          >
            Cancel
          </Link>
        }
      />
    </div>
  )
}
