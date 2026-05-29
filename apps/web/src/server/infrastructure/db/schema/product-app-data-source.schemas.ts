import type { UUIDv4 } from '@riposte/core'
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { products } from './product.schemas'

export const productAppDataSources = pgTable(
  'product_app_data_sources',
  {
    id: uuid('id').$type<UUIDv4>().defaultRandom().primaryKey(),

    productId: uuid('product_id')
      .$type<UUIDv4>()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    mcpServerId: text('mcp_server_id').notNull(),
    serverName: text('server_name').notNull(),
    serverUrl: text('server_url').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_app_data_sources_product_id_idx').on(table.productId),
    uniqueIndex('product_app_data_sources_product_mcp_server_unique').on(
      table.productId,
      table.mcpServerId,
    ),
  ],
)

export type DbProductAppDataSource = typeof productAppDataSources.$inferSelect
export type DbNewProductAppDataSource = typeof productAppDataSources.$inferInsert
