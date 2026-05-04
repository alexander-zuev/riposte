import type { DatabaseError, JoinWaitlist } from '@riposte/core'
import type { CommandHandler } from '@server/application/registry/types'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'

export const joinWaitlist: CommandHandler<
  JoinWaitlist,
  { alreadyExists: boolean },
  DatabaseError
> = async (command, _env, tx) => {
  const repo = new WaitlistRepository(tx)
  return repo.addEmail(command.email)
}
