import { z } from 'zod'

import { baseCommandSchema } from '../base/base.messages'
import { UserIdSchema } from '../primitives'
import { PLAYBOOK_MD_MAX_LENGTH, playbookVerificationSchema } from './dispute-playbook.schemas'

export const saveDisputePlaybookSchema = baseCommandSchema.extend({
  name: z.literal('SaveDisputePlaybook'),
  userId: UserIdSchema,
  productId: z.uuidv4(),
  playbookMd: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
  playbookVerification: playbookVerificationSchema.optional(),
})

export type SaveDisputePlaybook = z.infer<typeof saveDisputePlaybookSchema>
