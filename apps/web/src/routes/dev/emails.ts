import { ResendEmailService } from '@server/infrastructure/email/resend-email-service'
import { magicLinkEmailTemplate } from '@server/infrastructure/email/templates/magic-link.template'
import { welcomeEmailTemplate } from '@server/infrastructure/email/templates/welcome.template'
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'

const TEST_EMAIL_TO = 'azuev@outlook.com'

type RenderedEmail = {
  subject: string
  html: string
  text?: string
  tags?: string[]
}

type TemplateMeta = {
  id: string
  title: string
  description: string
  category: 'auth' | 'lifecycle'
  render: (origin: string) => RenderedEmail
}

const TEMPLATES: TemplateMeta[] = [
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

const TEMPLATE_RENDERERS = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template.render]),
) as Record<string, TemplateMeta['render'] | undefined>

function isDevOrTest(): boolean {
  return env.ENV === 'development' || env.ENV === 'test'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function badge(text: string): string {
  return `<span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:999px;">${escapeHtml(text)}</span>`
}

function indexPageHtml(origin: string): string {
  const cards = TEMPLATES.map((template) => {
    const email = template.render(origin)
    return `<a href="/dev/emails?template=${template.id}" style="display:block;text-decoration:none;color:inherit;border:1px solid #e5e7eb;border-radius:10px;padding:18px;background:#fff;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <h2 style="margin:0;font-size:16px;line-height:1.3;color:#111827;">${escapeHtml(template.title)}</h2>
        ${badge(template.category)}
      </div>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:#4b5563;">${escapeHtml(template.description)}</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">Subject: ${escapeHtml(email.subject)}</p>
    </a>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Riposte email templates</title>
</head>
<body style="margin:0;background:#f8fafc;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <main style="max-width:920px;margin:0 auto;padding:48px 24px;">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px;">
      <div>
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Dev tools</p>
        <h1 style="margin:0;font-size:32px;line-height:1.1;">Email templates</h1>
      </div>
      <p style="margin:0;font-size:13px;color:#6b7280;">${TEMPLATES.length} templates</p>
    </div>
    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;">
      ${cards}
    </section>
  </main>
</body>
</html>`
}

function previewToolbar(args: {
  origin: string
  pathname: string
  template: string
  email: RenderedEmail
  sent: boolean
}): string {
  return `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#111;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
      <a href="${args.origin}/dev/emails" style="color:#aaa;text-decoration:none;font-size:13px;">← Back</a>
      <span style="color:#fff;font-size:13px;font-weight:600;">${escapeHtml(args.template)}</span>
      <span style="color:#888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Subject: ${escapeHtml(args.email.subject)}</span>
    </div>
    <form method="POST" action="${args.pathname}?template=${args.template}" style="display:flex;align-items:center;gap:8px;margin:0;">
      <span style="color:#777;font-size:12px;">${TEST_EMAIL_TO}</span>
      <button type="submit" style="background:#fff;color:#111;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Send test</button>
    </form>
  </div>
  ${
    args.sent
      ? `<div style="position:fixed;top:44px;left:0;right:0;z-index:9998;background:#dcfce7;color:#15803d;padding:8px 16px;font-size:13px;font-weight:600;text-align:center;font-family:-apple-system,sans-serif;">Test email sent to ${TEST_EMAIL_TO}</div>`
      : ''
  }
  <div style="padding-top:${args.sent ? '80px' : '48px'};"></div>`
}

export const Route = createFileRoute('/dev/emails')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDevOrTest()) return new Response('Not found', { status: 404 })

        const url = new URL(request.url)
        const template = url.searchParams.get('template')

        if (!template) {
          return new Response(indexPageHtml(url.origin), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        }

        const render = TEMPLATE_RENDERERS[template]
        if (!render) return new Response(`Unknown template: ${template}`, { status: 404 })

        const email = render(url.origin)
        const toolbar = previewToolbar({
          origin: url.origin,
          pathname: url.pathname,
          template,
          email,
          sent: url.searchParams.get('sent') === '1',
        })
        const html = email.html.replaceAll('https://riposte.sh', url.origin)
        const injectedHtml = html.replace(/<body([^>]*)>/i, `<body$1>${toolbar}`)

        return new Response(injectedHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
      POST: async ({ request }) => {
        if (!isDevOrTest()) return new Response('Not found', { status: 404 })

        const url = new URL(request.url)
        const template = url.searchParams.get('template')
        if (!template) return new Response('Missing template', { status: 400 })

        const render = TEMPLATE_RENDERERS[template]
        if (!render) return new Response(`Unknown template: ${template}`, { status: 404 })

        const email = render(url.origin)
        const result = await new ResendEmailService(env.RESEND_API_KEY).sendEmail({
          to: TEST_EMAIL_TO,
          subject: `[Test] ${email.subject}`,
          html: email.html,
          text: email.text,
          tags: email.tags,
        })
        if (result.isErr()) throw result.error

        return Response.redirect(`${url.origin}/dev/emails?template=${template}&sent=1`, 303)
      },
    },
  },
})
