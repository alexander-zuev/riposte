import {
  boolean,
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'
import { stripeConnections } from './stripe-connection.schemas'

export const stripeDisputeSyncState = pgTable(
  'stripe_dispute_sync_state',
  {
    stripeAccountId: text('stripe_account_id').notNull(),
    livemode: boolean('livemode').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      columns: [table.stripeAccountId, table.livemode],
      name: 'stripe_dispute_sync_state_account_mode_pk',
    }),
    foreignKey({
      columns: [table.stripeAccountId, table.livemode],
      foreignColumns: [stripeConnections.stripeAccountId, stripeConnections.livemode],
      name: 'stripe_dispute_sync_state_connection_fk',
    }),
  ],
)

export type DbStripeDisputeSyncState = typeof stripeDisputeSyncState.$inferSelect
export type DbNewStripeDisputeSyncState = typeof stripeDisputeSyncState.$inferInsert
