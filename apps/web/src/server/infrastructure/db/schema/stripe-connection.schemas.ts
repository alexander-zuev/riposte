import { sql } from 'drizzle-orm'
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'

export const stripeConnections = pgTable(
  'stripe_connections',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    stripeAccountId: text('stripe_account_id').notNull(),
    stripeBusinessName: text('stripe_business_name'),
    livemode: boolean('livemode').notNull(),

    scope: text('scope'),
    tokenType: text('token_type'),

    credentialCiphertext: text('credential_ciphertext').notNull(),
    credentialIv: text('credential_iv').notNull(),
    credentialKeyVersion: text('credential_key_version').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),

    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex('stripe_connections_account_mode_unique').on(table.stripeAccountId, table.livemode),
    index('stripe_connections_user_id_idx').on(table.userId),
  ],
)

export type DbStripeConnection = typeof stripeConnections.$inferSelect
export type DbNewStripeConnection = typeof stripeConnections.$inferInsert
