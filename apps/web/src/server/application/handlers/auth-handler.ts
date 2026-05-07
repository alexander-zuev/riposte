import type {
  EmailServiceError,
  GetSessionStatus,
  SendMagicLink,
  SendWelcomeEmail,
  UserSignedUp,
} from '@riposte/core'
import { createLogger } from '@riposte/core'
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import { magicLinkEmailTemplate } from '@server/infrastructure/email/templates/magic-link.template'
import { welcomeEmailTemplate } from '@server/infrastructure/email/templates/welcome.template'
import { Result } from 'better-result'

const logger = createLogger('auth-handler')

export const sendWelcomeEmail: CommandHandler<SendWelcomeEmail, void, EmailServiceError> = async (
  command,
  ctx,
) => {
  logger.info('SendWelcomeEmail', { email: command.email })
  const template = welcomeEmailTemplate({
    appUrl: ctx.deps.env.APP_URL,
    userName: command.userName,
  })

  const sent = await ctx.deps.services.email().sendEmail({
    to: command.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: template.tags,
  })
  if (sent.isErr()) return sent

  return Result.ok()
}

export const sendMagicLink: CommandHandler<SendMagicLink, void, EmailServiceError> = async (
  command,
  ctx,
) => {
  logger.info('SendMagicLink', { email: command.email })
  const template = magicLinkEmailTemplate(command.magicLinkUrl)

  const sent = await ctx.deps.services.email().sendEmail({
    to: command.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: template.tags,
  })
  if (sent.isErr()) return sent

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
