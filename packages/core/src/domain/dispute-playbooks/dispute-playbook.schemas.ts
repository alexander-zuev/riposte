import { z } from 'zod'

import { TimestamptzSchema } from '../primitives'

/** Generous upper bound; expected playbooks are 2-50KB markdown. */
export const PLAYBOOK_MD_MAX_LENGTH = 1_000_000

export const createPlaybookInputSchema = z.object({
  productId: z.uuidv4(),
  createdBy: z.uuidv4(),
  playbookMd: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
})

/**
 * Progressive validation result. `section` is the plain heading text (the canonical
 * section list lives in the server domain, not here, to avoid coupling core to it).
 */
export const playbookValidationIssueSchema = z.object({
  section: z.string().min(1),
  issue: z.enum(['missing', 'too_short', 'no_source']),
})

export const playbookValidationSchema = z.object({
  complete: z.boolean(),
  remaining: z.array(playbookValidationIssueSchema),
})

/** Result of a write/edit: a new revision was persisted. */
export const disputePlaybookRevisionResultSchema = z.object({
  revision: z.number().int().positive(),
  validation: playbookValidationSchema,
})

/** Result of a read: the current revision's content. Absent playbooks return an error. */
export const readDisputePlaybookResultSchema = z.object({
  revision: z.number().int().positive(),
  content: z.string(),
  createdAt: TimestamptzSchema,
  validation: playbookValidationSchema,
})

export type CreatePlaybookInput = z.infer<typeof createPlaybookInputSchema>
export type PlaybookValidationIssue = z.infer<typeof playbookValidationIssueSchema>
export type PlaybookValidation = z.infer<typeof playbookValidationSchema>
export type DisputePlaybookRevisionResult = z.infer<typeof disputePlaybookRevisionResultSchema>
export type ReadDisputePlaybookResult = z.infer<typeof readDisputePlaybookResultSchema>
