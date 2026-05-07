import type { GetSessionStatus, SendMagicLink, SendWelcomeEmail, UserSignedUp } from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import { Result } from 'better-result'

const logger = createLogger('auth-handler')

export const sendWelcomeEmail: CommandHandler<SendWelcomeEmail> = async (command, _ctx) => {
  logger.info('SendWelcomeEmail', { email: command.email })
  // TODO: implement email sending via Resend
  return Result.ok()
}

export const sendMagicLink: CommandHandler<SendMagicLink> = async (command, _ctx) => {
  logger.info('SendMagicLink', { email: command.email })
  // TODO: implement email sending via Resend
  return Result.ok()
}

export const handleUserSignedUp: EventHandler<UserSignedUp> = async (event, _ctx) => {
  logger.info('UserSignedUp', { userId: event.userId, email: event.email })
  // TODO: implement post-signup logic
  return Result.ok()
}

export const getSessionStatus: QueryHandler<GetSessionStatus, { active: boolean }> = async (
  query,
  _ctx,
) => {
  logger.debug('GetSessionStatus', { userId: query.userId })
  // TODO: implement session status check
  return Result.ok({ active: false })
}
