import type { GetSessionStatus, SendWelcomeEmail, UserSignedUp } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'

const logger = createLogger('auth-handler')

export const sendWelcomeEmail: CommandHandler<SendWelcomeEmail, void> = async (
  command,
  _env,
  _tx,
) => {
  logger.info('SendWelcomeEmail', { email: command.email })
  // TODO: implement email sending via Resend
}

export const handleUserSignedUp: EventHandler<UserSignedUp> = async (event, _env, _tx) => {
  logger.info('UserSignedUp', { userId: event.userId, email: event.email })
  // TODO: implement post-signup logic
}

export const getSessionStatus: QueryHandler<GetSessionStatus, { active: boolean }> = async (
  query,
  _env,
) => {
  logger.debug('GetSessionStatus', { userId: query.userId })
  // TODO: implement session status check
  return { active: false }
}
