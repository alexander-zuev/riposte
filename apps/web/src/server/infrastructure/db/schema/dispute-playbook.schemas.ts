import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth.schemas'
import { products } from './product.schemas'

export const disputePlaybooks = pgTable(
  'dispute_playbooks',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    revision: integer('revision').notNull(),

    playbookMd: text('playbook_md').notNull(),
    playbookHash: text('playbook_hash').notNull(),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dispute_playbooks_product_revision_unique').on(table.productId, table.revision),
    index('dispute_playbooks_product_revision_idx').on(table.productId, table.revision.desc()),
    check('dispute_playbooks_revision_positive_check', sql`${table.revision} > 0`),
  ],
)

export type DbDisputePlaybook = typeof disputePlaybooks.$inferSelect
export type DbNewDisputePlaybook = typeof disputePlaybooks.$inferInsert
