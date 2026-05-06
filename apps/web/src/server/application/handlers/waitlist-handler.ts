import type { DatabaseError, JoinWaitlist } from '@riposte/core'
import type { CommandHandler } from '@server/application/registry/types'

export const joinWaitlist: CommandHandler<
  JoinWaitlist,
  { alreadyExists: boolean },
  DatabaseError
> = async (command, { deps, tx }) => {
  const repo = deps.repos.waitlist(tx)
  return repo.addEmail(command.email)
}
