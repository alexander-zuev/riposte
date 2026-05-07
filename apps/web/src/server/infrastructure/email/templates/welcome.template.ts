import {
  emailButton,
  emailCard,
  emailFooter,
  emailGreeting,
  emailH1,
  emailLogo,
  emailP,
  emailWrapper,
} from './email-design-system'

export function welcomeEmailTemplate(args: { appUrl: string; userName?: string }) {
  const greeting = emailGreeting(args.userName)
  const dashboardUrl = `${args.appUrl}/dashboard`

  return {
    subject: 'Welcome to Riposte',
    html: emailWrapper(`
${emailLogo()}
${emailCard(`
              ${emailH1('Welcome to Riposte')}
              ${emailP(greeting)}
              ${emailP('Riposte helps you prepare and manage Stripe dispute responses without losing track of evidence, deadlines, or next steps.')}
              ${emailButton('Open Riposte', dashboardUrl, 'welcome')}
`)}
${emailFooter()}
    `),
    text: `Welcome to Riposte

${greeting}

Riposte helps you prepare and manage Stripe dispute responses without losing track of evidence, deadlines, or next steps.

Open Riposte:
${dashboardUrl}

© ${new Date().getFullYear()} Riposte. All rights reserved.`,
    tags: ['auth', 'welcome'],
  }
}
