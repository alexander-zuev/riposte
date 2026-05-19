import { ArrowRightIcon, WarningIcon } from '@phosphor-icons/react'
import { PRODUCT_SETUP_STEPS, type ProductSetupState } from '@riposte/core/client'
import { Link } from '@tanstack/react-router'
import { useProductSetup } from '@web/features/agent/hooks/use-product-setup'
import { deriveStepStatus } from '@web/features/agent/setup-steps'
import { StepChip } from '@web/features/agent/step-chip'
import { buttonVariants } from '@web/ui/components/ui/button'

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
          <StepChip step={step} status={deriveStepStatus(state, step)} />
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
