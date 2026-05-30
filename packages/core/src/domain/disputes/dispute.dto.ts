import { z } from 'zod'

import { moneySchema, TimestamptzSchema } from '../primitives'
import {
  contestDecisionKindSchema,
  disputeCaseWorkflowStatusSchema,
} from './dispute-workflow-policy'
import { stripeDisputeStatusSchema } from './stripe-dispute-taxonomy'

export const stripeDisputeListItemSchema = z.object({
  id: z.string().min(1),
  amount: moneySchema,
  reason: z.string().min(1),
  status: stripeDisputeStatusSchema,
  createdAt: TimestamptzSchema,
  evidenceDueBy: TimestamptzSchema.nullable(),
  chargeId: z.string().min(1),
  paymentIntentId: z.string().min(1).nullable(),
  livemode: z.boolean(),
})

export const disputeCaseStatusSchema = z.object({
  disputeCaseId: z.string().min(1),
  workflowStatus: disputeCaseWorkflowStatusSchema,
  stripeStatus: stripeDisputeStatusSchema,
  contestDecision: contestDecisionKindSchema,
  evidenceDueBy: TimestamptzSchema.nullable(),
  updatedAt: TimestamptzSchema,
  humanRequest: z
    .object({
      kind: z.enum(['triage_review', 'submission_approval']),
      requestedAt: TimestamptzSchema,
      allowedResponses: z.array(z.string().min(1)),
    })
    .nullable(),
  completion: z
    .object({
      reason: z.string().min(1),
      completedAt: TimestamptzSchema,
    })
    .nullable(),
  failure: z
    .object({
      reason: z.string().min(1),
    })
    .nullable(),
})

export type StripeDisputeListItem = z.infer<typeof stripeDisputeListItemSchema>
export type DisputeCaseStatus = z.infer<typeof disputeCaseStatusSchema>
