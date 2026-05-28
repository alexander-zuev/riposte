import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'
import { PLAYBOOK_MD_MAX_LENGTH } from './dispute-playbook.schemas'

export const writeDisputePlaybookSchema = baseCommandSchema.extend({
  name: z.literal('WriteDisputePlaybook'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
  content: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
})

export type WriteDisputePlaybook = z.infer<typeof writeDisputePlaybookSchema>

export const editDisputePlaybookSchema = baseCommandSchema.extend({
  name: z.literal('EditDisputePlaybook'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
  /** Revision the edit is based on; must match the current revision. */
  baseRevision: z.number().int().positive(),
  old: z.string().min(1),
  new: z.string().max(PLAYBOOK_MD_MAX_LENGTH),
})

export type EditDisputePlaybook = z.infer<typeof editDisputePlaybookSchema>
