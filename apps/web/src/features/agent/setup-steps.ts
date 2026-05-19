import type { ProductSetupState, ProductSetupStep } from '@riposte/core/client'

/** User-facing label for each setup step. Single source of truth for banner + sidebar. */
export const STEP_LABELS: Record<ProductSetupStep, string> = {
  add_product: 'Get started',
  connect_stripe: 'Connect Stripe',
  connect_app_data: 'Connect app data',
  playbook: 'Define playbook',
  dry_run: 'Dry run',
  review: 'Review & approve',
}

export type StepChipStatus = 'done' | 'active' | 'pending'

export function deriveStepStatus(state: ProductSetupState, step: ProductSetupStep): StepChipStatus {
  if (state.completedAt[step] !== null) return 'done'
  if (state.currentStep === step) return 'active'
  return 'pending'
}
