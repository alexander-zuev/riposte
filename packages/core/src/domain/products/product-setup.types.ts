import { z } from 'zod'

/**
 * Product setup steps in fixed order. Each step is satisfied by the existence of a
 * concrete artifact (product row, stripe connection, app-data source, playbook,
 * dry-run completion, product status flip). The current step is derived from
 * artifact presence; it is never stored.
 */
export const PRODUCT_SETUP_STEPS = [
  'add_product',
  'connect_stripe',
  'connect_app_data',
  'playbook',
  'dry_run',
  'review',
] as const
export type ProductSetupStep = (typeof PRODUCT_SETUP_STEPS)[number]
export const productSetupStepSchema = z.enum(PRODUCT_SETUP_STEPS)
