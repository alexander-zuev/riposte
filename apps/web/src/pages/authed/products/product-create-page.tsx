import { PackageIcon } from '@phosphor-icons/react'
import {
  PRODUCT_TYPES,
  createProductInputSchema,
  productUrlSchema,
  type ProductType,
} from '@riposte/core/client'
import { useForm } from '@tanstack/react-form'
import { Link } from '@tanstack/react-router'
import {
  type CreateProductRequest,
  useCreateProductMutation,
} from '@web/entities/products/product-mutations'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { Button, buttonVariants } from '@web/ui/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@web/ui/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/ui/components/ui/select'
import { z } from 'zod'

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  physical_product: 'Physical product',
  digital_product_or_service: 'Digital product or service',
  offline_service: 'Offline service',
}

/** Strips noise users sometimes paste so state holds just the bare host/path. */
function stripUrlNoise(value: string): string {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^\/\//, '')
    .replace(/^www\./i, '')
}

/** Turns raw user input into a canonical https:// URL the server expects. */
function normalizeProductUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  try {
    const url = new URL(`https://${trimmed}`)
    const canonical = url.toString()
    return url.pathname === '/' && !url.search && !url.hash
      ? canonical.replace(/\/$/, '')
      : canonical
  } catch {
    return `https://${trimmed}`
  }
}

const productUrlFormSchema = z
  .string()
  .trim()
  .min(1, { error: 'Add a website URL' })
  .transform((value) => normalizeProductUrl(value))
  .pipe(productUrlSchema)

const productCreateFormSchema = createProductInputSchema
  .omit({ userId: true })
  .extend({ url: productUrlFormSchema })

type ProductCreateFormValues = z.input<typeof productCreateFormSchema>

const PRODUCT_CREATE_FORM_DEFAULT_VALUES: ProductCreateFormValues = {
  productName: '',
  url: '',
  productType: 'digital_product_or_service',
}

export function ProductCreatePage() {
  const mutation = useCreateProductMutation()

  const form = useForm({
    defaultValues: PRODUCT_CREATE_FORM_DEFAULT_VALUES,
    validators: {
      onSubmit: productCreateFormSchema,
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        url: normalizeProductUrl(value.url),
      } satisfies CreateProductRequest

      mutation.mutate(payload)
    },
  })

  const isSubmitting = mutation.isPending

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="New product"
        description="Add an app you want to protect against Stripe disputes"
        eyebrow="Products"
        icon={PackageIcon}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
        className="max-w-xl"
      >
        <FieldGroup>
          <form.Field name="productName">
            {(field) => (
              <Field data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Product name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Acme"
                  disabled={isSubmitting}
                  aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                />
                {field.state.meta.isTouched && !field.state.meta.isValid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : (
                  <FieldDescription>How you refer to this product internally</FieldDescription>
                )}
              </Field>
            )}
          </form.Field>

          <form.Field name="url">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor={field.name}>Website URL</FieldLabel>
                <InputGroup>
                  <InputGroupAddon className="border-r border-border bg-muted px-2.5">
                    <InputGroupText>https://</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    inputMode="url"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(stripUrlNoise(event.target.value))}
                    placeholder="acme.com"
                    disabled={isSubmitting}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                </InputGroup>
                {field.state.meta.errors.length > 0 ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : (
                  <FieldDescription>Public-facing site your customers visit</FieldDescription>
                )}
              </Field>
            )}
          </form.Field>

          <form.Field name="productType">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Product type</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as ProductType)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id={field.name} aria-invalid={!field.state.meta.isValid}>
                    <SelectValue>{PRODUCT_TYPE_LABEL[field.state.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PRODUCT_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!field.state.meta.isValid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : (
                  <FieldDescription>
                    Determines which Stripe evidence fields apply during disputes
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/products"
              className={buttonVariants({ variant: 'secondary' })}
              aria-disabled={isSubmitting}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              Create product
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
