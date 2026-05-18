import type { ProductStatus, ProductType, ServiceStartRule } from '@server/domain/products'
import { PRODUCT_TYPES } from '@server/domain/products'
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'

const productTypeCheckValues = PRODUCT_TYPES.map((value) => `'${value}'`).join(', ')

export const products = pgTable(
  'products',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    // Identity
    productName: text('product_name').notNull(),
    url: text('url').notNull(),

    // Product type mirrors Stripe's dispute evidence product-type selector.
    productType: text('product_type')
      .$type<ProductType>()
      .notNull()
      .default('digital_product_or_service'),

    // Stripe-submittable structured fields. Nullable at create; agent fills during onboarding.
    productDescription: text('product_description'),
    serviceStartRule: text('service_start_rule').$type<ServiceStartRule>(),
    refundPolicyDisclosure: text('refund_policy_disclosure'),
    cancellationPolicyDisclosure: text('cancellation_policy_disclosure'),

    // Lifecycle
    status: text('status').$type<ProductStatus>().notNull().default('setup_pending'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index('products_user_id_idx').on(table.userId),
    uniqueIndex('products_user_id_url_uniq').on(table.userId, table.url),
    check(
      'products_status_check',
      sql`${table.status} in ('setup_pending', 'setup_complete', 'disabled')`,
    ),
    check(
      'products_product_type_check',
      sql`${table.productType} in (${sql.raw(productTypeCheckValues)})`,
    ),
    check(
      'products_service_start_rule_check',
      sql`${table.serviceStartRule} is null or ${table.serviceStartRule} in ('charge_succeeded_at', 'billing_period_start', 'app_entitlement_started_at', 'first_verified_usage_at', 'merchant_provided')`,
    ),
  ],
)

export type DbProduct = typeof products.$inferSelect
export type DbNewProduct = typeof products.$inferInsert
