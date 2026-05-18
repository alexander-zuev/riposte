import { z } from 'zod'

/** Generous upper bound; expected playbooks are 2-50KB markdown. */
export const PLAYBOOK_MD_MAX_LENGTH = 1_000_000

export const createPlaybookInputSchema = z.object({
  productId: z.uuidv4(),
  createdBy: z.uuidv4(),
  playbookMd: z.string().trim().min(1).max(PLAYBOOK_MD_MAX_LENGTH),
})

export type CreatePlaybookInput = z.infer<typeof createPlaybookInputSchema>
