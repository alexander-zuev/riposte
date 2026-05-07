export const EMAIL_COLORS = {
  bg: '#f6f6f4',
  bgCard: '#ffffff',
  text: '#3f3f3f',
  textBright: '#1f1f1f',
  textMuted: '#6f6f6f',
  textFaint: '#9a9a9a',
  accent: '#1f1f1f',
  accentText: '#ffffff',
  borderSubtle: '#e7e5e0',
} as const

export const EMAIL_FONTS = {
  family:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const

export const EMAIL_TYPOGRAPHY = {
  h1: { fontSize: '24px', fontWeight: '700', letterSpacing: '-0.01em' },
  body: { fontSize: '16px', lineHeight: '1.6' },
  small: { fontSize: '14px' },
  footer: { fontSize: '12px' },
  button: { fontSize: '15px', fontWeight: '600' },
  logo: { fontSize: '22px', fontWeight: '700', letterSpacing: '0.04em' },
} as const

export function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_COLORS.bg}; font-family: ${EMAIL_FONTS.family};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

export function emailLogo(): string {
  return `
          <tr>
            <td style="padding-bottom: 32px;">
              <img src="https://riposte.sh/android-chrome-192x192.png" alt="Riposte" width="40" height="40" style="display: inline-block; vertical-align: middle; border-radius: 8px; border: 0;">
              <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: ${EMAIL_TYPOGRAPHY.logo.fontSize}; font-weight: ${EMAIL_TYPOGRAPHY.logo.fontWeight}; color: ${EMAIL_COLORS.textBright}; letter-spacing: ${EMAIL_TYPOGRAPHY.logo.letterSpacing};">
                Riposte
              </span>
            </td>
          </tr>`
}

export function emailCard(content: string): string {
  return `
          <tr>
            <td style="background-color: ${EMAIL_COLORS.bgCard}; border-radius: 12px; padding: 32px;">
${content}
            </td>
          </tr>`
}

export function emailFooter(): string {
  return `
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: ${EMAIL_TYPOGRAPHY.footer.fontSize}; color: ${EMAIL_COLORS.textFaint};">
                &copy; ${new Date().getFullYear()} Riposte. All rights reserved.
              </p>
            </td>
          </tr>`
}

export function emailDivider(): string {
  return `<hr style="border: none; border-top: 1px solid ${EMAIL_COLORS.borderSubtle}; margin: 20px 0 16px;">`
}

function withUtm(href: string, campaign: string): string {
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}utm_source=riposte&utm_medium=email&utm_campaign=${campaign}`
}

export function emailButton(text: string, href: string, campaign: string): string {
  const url = withUtm(href, campaign)
  return `<div style="text-align: center; margin: 24px 0;">
                <a href="${url}" style="display: inline-block; background-color: ${EMAIL_COLORS.accent}; color: ${EMAIL_COLORS.accentText}; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: ${EMAIL_TYPOGRAPHY.button.fontWeight}; font-size: ${EMAIL_TYPOGRAPHY.button.fontSize};">
                  ${text}
                </a>
              </div>`
}

export function emailH1(text: string): string {
  return `<h1 style="margin: 0 0 16px; font-size: ${EMAIL_TYPOGRAPHY.h1.fontSize}; font-weight: ${EMAIL_TYPOGRAPHY.h1.fontWeight}; color: ${EMAIL_COLORS.textBright}; letter-spacing: ${EMAIL_TYPOGRAPHY.h1.letterSpacing};">
                ${text}
              </h1>`
}

export function emailP(text: string, marginBottom = '16px'): string {
  return `<p style="margin: 0 0 ${marginBottom}; font-size: ${EMAIL_TYPOGRAPHY.body.fontSize}; line-height: ${EMAIL_TYPOGRAPHY.body.lineHeight}; color: ${EMAIL_COLORS.text};">
                ${text}
              </p>`
}

export function emailSmall(text: string): string {
  return `<p style="margin: 0; font-size: ${EMAIL_TYPOGRAPHY.small.fontSize}; color: ${EMAIL_COLORS.textMuted};">
                ${text}
              </p>`
}

export function toFirstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0]!
}

export function emailGreeting(name: string | null | undefined, fallback = 'Hi,'): string {
  const first = toFirstName(name)
  return first ? `Hi ${first},` : fallback
}
