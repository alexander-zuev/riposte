import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const stripeConnections = pgTable(
  'stripe_connections',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    stripeAccountId: text('stripe_account_id').notNull(),
    livemode: boolean('livemode').notNull(),

    status: text('status').notNull(),
    scope: text('scope'),
    tokenType: text('token_type'),

    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),

    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex('stripe_connections_account_mode_unique').on(table.stripeAccountId, table.livemode),
    index('stripe_connections_status_idx').on(table.status),
    check(
      'stripe_connections_status_check',
      sql`${table.status} in ('active', 'revoked', 'needs_reauth')`,
    ),
  ],
)

export type DbStripeConnection = typeof stripeConnections.$inferSelect
export type DbNewStripeConnection = typeof stripeConnections.$inferInsert
