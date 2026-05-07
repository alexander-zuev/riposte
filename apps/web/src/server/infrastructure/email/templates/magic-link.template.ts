import {
  emailButton,
  emailCard,
  emailDivider,
  emailFooter,
  emailH1,
  emailLogo,
  emailP,
  emailSmall,
  emailWrapper,
} from './email-design-system'

export function magicLinkEmailTemplate(url: string) {
  return {
    subject: 'Sign in to Riposte',
    html: emailWrapper(`
${emailLogo()}
${emailCard(`
              ${emailH1('Sign in to Riposte')}
              ${emailP('Click the button below to sign in. This link expires in 5 minutes.')}
              ${emailButton('Sign in to Riposte', url, 'magic-link')}
              ${emailDivider()}
              ${emailSmall("If you didn't request this email, you can safely ignore it.")}
`)}
${emailFooter()}
    `),
    text: `Sign in to Riposte

Click the link below to sign in:
${url}

This link expires in 5 minutes.

If you didn't request this email, you can safely ignore it.

© ${new Date().getFullYear()} Riposte. All rights reserved.`,
    tags: ['auth', 'magic-link'],
  }
}
