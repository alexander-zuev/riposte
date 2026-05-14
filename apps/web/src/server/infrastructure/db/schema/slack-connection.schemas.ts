import type { SlackConnectionStatus } from '@server/domain/slack'
import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'

export const slackConnections = pgTable(
  'slack_connections',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    teamId: text('team_id').notNull(),
    teamName: text('team_name'),
    channelId: text('channel_id'),
    channelName: text('channel_name'),
    status: text('status').$type<SlackConnectionStatus>().notNull().default('active'),
    failureReason: text('failure_reason'),

    webhookCiphertext: text('webhook_ciphertext').notNull(),
    webhookIv: text('webhook_iv').notNull(),
    webhookKeyVersion: text('webhook_key_version').notNull(),

    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull(),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex('slack_connections_user_team_unique').on(table.userId, table.teamId),
    index('slack_connections_user_id_idx').on(table.userId),
    index('slack_connections_team_id_idx').on(table.teamId),
    index('slack_connections_status_idx').on(table.status),
    check('slack_connections_status_check', sql`${table.status} in ('active', 'failed')`),
  ],
)

export type DbSlackConnection = typeof slackConnections.$inferSelect
export type DbNewSlackConnection = typeof slackConnections.$inferInsert
