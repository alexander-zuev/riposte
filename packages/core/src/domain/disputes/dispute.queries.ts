import { z } from 'zod'

import { baseQuerySchema } from '../base/base.messages'
import { moneySchema, TimestamptzSchema, UserIdSchema } from '../primitives'
import {
  contestDecisionKindSchema,
  disputeCaseWorkflowStatusSchema,
} from './dispute-workflow-policy'
import { stripeDisputeStatusSchema } from './stripe-dispute-taxonomy'

export const disputeCaseSortFieldSchema = z.enum(['evidenceDueBy', 'stripeCreatedAt', 'amount'])
export const disputeCaseSortDirectionSchema = z.enum(['asc', 'desc'])

export const disputeCaseSortSchema = z.object({
  field: disputeCaseSortFieldSchema,
  direction: disputeCaseSortDirectionSchema,
})

export const disputeCaseListCursorSchema = z.object({
  sortValue: z.union([z.number().int(), TimestamptzSchema]),
  id: z.string().min(1),
})

export const disputeCaseListFiltersSchema = z.object({
  statuses: z.array(disputeCaseWorkflowStatusSchema).max(10).optional(),
})

export const disputeCaseListItemSchema = z.object({
  disputeId: z.string().min(1),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  workflowStatus: disputeCaseWorkflowStatusSchema,
  contestDecision: contestDecisionKindSchema,
  stripeStatus: stripeDisputeStatusSchema,
  reason: z.string().min(1),
  amount: moneySchema,
  evidenceDueBy: TimestamptzSchema.nullable(),
  stripeCreatedAt: TimestamptzSchema,
  updatedAt: TimestamptzSchema,
})

export const disputeSyncStateSchema = z.object({
  lastSyncedAt: TimestamptzSchema.nullable(),
})

export const getStripeAppSettingsSchema = baseQuerySchema.extend({
  name: z.literal('GetStripeAppSettings'),
  stripeAccountId: z.string().min(1),
  livemode: z.boolean(),
})

export const listDisputeCasesSchema = baseQuerySchema.extend({
  name: z.literal('ListDisputeCases'),
  userId: UserIdSchema,
  limit: z.number().int().min(1).max(50).default(20),
  cursor: disputeCaseListCursorSchema.optional(),
  filters: disputeCaseListFiltersSchema.optional(),
  sort: disputeCaseSortSchema.default({
    field: 'evidenceDueBy',
    direction: 'asc',
  }),
})

export const listDisputeCasesResultSchema = z.object({
  items: z.array(disputeCaseListItemSchema),
  nextCursor: disputeCaseListCursorSchema.nullable(),
  sync: disputeSyncStateSchema,
})

export type DisputeCaseSortField = z.infer<typeof disputeCaseSortFieldSchema>
export type DisputeCaseSortDirection = z.infer<typeof disputeCaseSortDirectionSchema>
export type DisputeCaseSort = z.infer<typeof disputeCaseSortSchema>
export type DisputeCaseListCursor = z.infer<typeof disputeCaseListCursorSchema>
export type DisputeCaseListFilters = z.infer<typeof disputeCaseListFiltersSchema>
export type DisputeCaseListItem = z.infer<typeof disputeCaseListItemSchema>
export type DisputeSyncState = z.infer<typeof disputeSyncStateSchema>
export type GetStripeAppSettings = z.infer<typeof getStripeAppSettingsSchema>
export type ListDisputeCases = z.infer<typeof listDisputeCasesSchema>
export type ListDisputeCasesResult = z.infer<typeof listDisputeCasesResultSchema>
