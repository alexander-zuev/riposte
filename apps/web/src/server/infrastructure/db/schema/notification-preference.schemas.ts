import type { NotificationChannel } from '@server/domain/connections'
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

import { user } from './auth.schemas'

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),

    channel: text('channel').$type<NotificationChannel>().notNull(),
    enabled: boolean('enabled').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex('notification_preferences_user_channel_unique').on(table.userId, table.channel),
    index('notification_preferences_user_id_idx').on(table.userId),
    check('notification_preferences_channel_check', sql`${table.channel} in ('email', 'slack')`),
  ],
)

export type DbNotificationPreference = typeof notificationPreferences.$inferSelect
export type DbNewNotificationPreference = typeof notificationPreferences.$inferInsert
