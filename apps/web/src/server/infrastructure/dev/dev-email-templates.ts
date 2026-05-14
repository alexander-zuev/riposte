import { ResendEmailService } from '@server/infrastructure/email/resend-email-service'
import { magicLinkEmailTemplate } from '@server/infrastructure/email/templates/magic-link.template'
import { welcomeEmailTemplate } from '@server/infrastructure/email/templates/welcome.template'
import { env } from 'cloudflare:workers'

export const DEV_TEST_EMAIL_TO = 'azuev@outlook.com'

export type DevRenderedEmail = {
  subject: string
  html: string
  text?: string
  tags?: string[]
}

export type DevEmailTemplateCategory = 'auth' | 'lifecycle'

export type DevEmailTemplateId = 'magic-link' | 'welcome'

export type DevEmailTemplateMeta = {
  id: DevEmailTemplateId
  title: string
  description: string
  category: DevEmailTemplateCategory
  render: (origin: string) => DevRenderedEmail
}

export const DEV_EMAIL_TEMPLATES: DevEmailTemplateMeta[] = [
  {
    id: 'magic-link',
    title: 'Magic link',
    description: 'Sent when a user requests a passwordless sign-in link',
    category: 'auth',
    render: (origin) =>
      magicLinkEmailTemplate(`${origin}/api/auth/magic-link/verify?token=dev-token`),
  },
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Sent after account creation',
    category: 'lifecycle',
    render: (origin) => welcomeEmailTemplate({ appUrl: origin, userName: 'Alex' }),
  },
]

export function getDevEmailTemplate(id: string | null): DevEmailTemplateMeta | null {
  return DEV_EMAIL_TEMPLATES.find((template) => template.id === id) ?? null
}

export async function sendDevTestEmail(email: DevRenderedEmail) {
  return await new ResendEmailService(env.RESEND_API_KEY).sendEmail({
    to: DEV_TEST_EMAIL_TO,
    subject: `[Test] ${email.subject}`,
    html: email.html,
    text: email.text,
    tags: email.tags,
  })
}
