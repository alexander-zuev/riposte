import { DotsThreeIcon, PencilSimpleIcon, PlusIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import type { ProductListItem } from '@riposte/core/client'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ProductIcon } from '@web/entities/products/product-icon'
import { productQueries } from '@web/entities/products/product-queries'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Badge } from '@web/ui/components/ui/badge'
import { Button, buttonVariants } from '@web/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import type { ComponentProps } from 'react'

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const STATUS_BADGE_VARIANT: Record<ProductListItem['status'], BadgeVariant> = {
  setup_pending: 'warning',
  setup_complete: 'success',
  disabled: 'secondary',
}

const STATUS_LABEL: Record<ProductListItem['status'], string> = {
  setup_pending: 'Setup pending',
  setup_complete: 'Active',
  disabled: 'Disabled',
}

export function ProductsPage() {
  const { data } = useQuery(productQueries.list())
  const products = data?.items ?? []

  if (products.length === 0) return <ProductsEmpty />

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Your products"
        description={`${products.length} product${products.length === 1 ? '' : 's'}`}
        action={
          <Link to="/products/new" className={buttonVariants()}>
            <PlusIcon data-icon="inline-start" />
            Add product
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

function ProductsEmpty() {
  return (
    <div className="grid place-items-center gap-6 py-24 text-center text-foreground">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <ShieldCheckIcon className="size-8 text-muted-foreground" weight="duotone" />
      </div>
      <div className="grid max-w-md gap-2">
        <h1>Welcome to Riposte</h1>
        <p className="text-muted-foreground">
          Products are the apps you protect against Stripe disputes. Create your first to get
          started
        </p>
      </div>
      <Link to="/products/new" className={buttonVariants()}>
        <PlusIcon data-icon="inline-start" />
        Create your first product
      </Link>
    </div>
  )
}

const dateAddedFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <div className="relative rounded-lg border border-border bg-background p-5 transition-colors hover:border-border-interactive">
      <div className="mb-3 flex items-start justify-between">
        <ProductIcon url={product.url} className="size-6 rounded-sm" />
        <Badge variant={STATUS_BADGE_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
      </div>
      <Link
        to="/products/$productId"
        params={{ productId: product.id }}
        className="text-system font-semibold text-foreground no-underline before:absolute before:inset-0 before:rounded-lg before:content-['']"
      >
        {product.productName}
      </Link>
      <a
        href={product.url}
        target="_blank"
        rel="noreferrer"
        className="relative z-10 block w-fit text-xs text-muted-foreground"
      >
        {product.url}
      </a>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Added {dateAddedFormatter.format(new Date(product.createdAt))}
        </p>
        <ProductCardMenu productId={product.id} />
      </div>
    </div>
  )
}

function ProductCardMenu({ productId }: { productId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10"
            aria-label="Product actions"
          />
        }
      >
        <DotsThreeIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link
              to="/products/$productId/general"
              params={{ productId }}
              className="no-underline hover:no-underline"
            />
          }
        >
          <PencilSimpleIcon weight="duotone" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
