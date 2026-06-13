import { z } from 'zod'

/**
 * Connection status of a registered app data source, as tracked in Postgres.
 * `connected` = registered and live; `disconnected` = registered but the MCP
 * server is currently down (involuntary loss). User removal deletes the row, so
 * there is no `removed` status.
 */
export const productAppDataSourceStatusSchema = z.enum(['connected', 'disconnected'])

export type ProductAppDataSourceStatus = z.infer<typeof productAppDataSourceStatusSchema>
