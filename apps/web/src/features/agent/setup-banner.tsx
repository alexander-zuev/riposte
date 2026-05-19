import { ArrowRightIcon, CheckCircleIcon, CircleIcon, WarningIcon } from '@phosphor-icons/react'
import {
  PRODUCT_SETUP_STEPS,
  type ProductSetupState,
  type ProductSetupStep,
} from '@riposte/core/client'
import { Link } from '@tanstack/react-router'
import { useProductSetup } from '@web/features/agent/hooks/use-product-setup'
import { buttonVariants } from '@web/ui/components/ui/button'

const STEP_LABELS: Record<ProductSetupStep, string> = {
  add_product: 'Get started',
  connect_stripe: 'Connect Stripe',
  connect_app_data: 'Connect app data',
  playbook: 'Define playbook',
  dry_run: 'Dry run',
  review: 'Review & approve',
}

type SetupBannerProps = {
  productId: string
}

/**
 * Pre-setup banner shown on dashboard until `setupComplete`. Gone once setup
 * completes. Reads `productQueries.setup(productId)` — assumed warm in cache
 * via route-level `ensureQueryData`.
 */
export function SetupBanner({ productId }: SetupBannerProps) {
  const setup = useProductSetup(productId)
  if (setup.status !== 'incomplete') return null
  const state = setup.state

  return (
    <section className="flex flex-col gap-3 border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <WarningIcon className="mt-0.5 size-5 shrink-0 text-warning-muted-foreground" />
          <div>
            <strong>Setup incomplete</strong>
            <small className="mt-1 block text-muted-foreground">
              Riposte won't auto-defend disputes until setup is complete
            </small>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <small className="text-muted-foreground">{counterLabel(state)}</small>
          <Link
            to="/products/$productId/agent"
            params={{ productId }}
            className={buttonVariants({ size: 'sm' })}
          >
            Continue setup
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </div>
      <StepStrip state={state} />
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <small className="text-muted-foreground">{counterLabel(state)}</small>
        <Link
          to="/products/$productId/agent"
          params={{ productId }}
          className={buttonVariants({ size: 'sm' })}
        >
          Continue setup
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </div>
    </section>
  )
}

function counterLabel(state: ProductSetupState): string {
  const done = PRODUCT_SETUP_STEPS.filter((step) => state.completedAt[step] !== null).length
  return `${done} of ${PRODUCT_SETUP_STEPS.length}`
}

function StepStrip({ state }: { state: ProductSetupState }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {PRODUCT_SETUP_STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-3">
          <StepChip step={step} state={state} />
          {index < PRODUCT_SETUP_STEPS.length - 1 ? (
            <span aria-hidden className="text-muted-foreground">
              ›
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function StepChip({ step, state }: { step: ProductSetupStep; state: ProductSetupState }) {
  const done = state.completedAt[step] !== null
  const active = state.currentStep === step

  if (done) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <CheckCircleIcon weight="fill" className="size-4 text-success-muted-foreground" />
        <small>{STEP_LABELS[step]}</small>
      </span>
    )
  }

  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-foreground">
        <CircleIcon className="size-4" />
        <small className="font-semibold">{STEP_LABELS[step]}</small>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <CircleIcon className="size-4" />
      <small>{STEP_LABELS[step]}</small>
    </span>
  )
}
