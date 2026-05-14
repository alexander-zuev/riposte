import {
  DEV_TEST_EMAIL_TO,
  getDevEmailTemplate,
  sendDevTestEmail,
  type DevRenderedEmail,
} from '@server/infrastructure/dev/dev-email-templates'
import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { devOnlyRequestMiddleware } from '@server/infrastructure/middleware/dev-only.middleware'
import { createFileRoute } from '@tanstack/react-router'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function previewToolbar(args: {
  origin: string
  pathname: string
  template: string
  email: DevRenderedEmail
  sent: boolean
}): string {
  return `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#111;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
      <a href="${args.origin}/dev/emails" style="color:#aaa;text-decoration:none;font-size:13px;">Back</a>
      <span style="color:#fff;font-size:13px;font-weight:600;">${escapeHtml(args.template)}</span>
      <span style="color:#888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Subject: ${escapeHtml(args.email.subject)}</span>
    </div>
    <form method="POST" action="${args.pathname}?template=${args.template}" style="display:flex;align-items:center;gap:8px;margin:0;">
      <span style="color:#777;font-size:12px;">${DEV_TEST_EMAIL_TO}</span>
      <button type="submit" style="background:#fff;color:#111;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Send test</button>
    </form>
  </div>
  ${
    args.sent
      ? `<div style="position:fixed;top:44px;left:0;right:0;z-index:9998;background:#dcfce7;color:#15803d;padding:8px 16px;font-size:13px;font-weight:600;text-align:center;font-family:-apple-system,sans-serif;">Test email sent to ${DEV_TEST_EMAIL_TO}</div>`
      : ''
  }
  <div style="padding-top:${args.sent ? '80px' : '48px'};"></div>`
}

export const Route = createFileRoute('/api/dev/emails/preview')({
  server: {
    middleware: [routeErrorMiddleware, devOnlyRequestMiddleware],
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const template = getDevEmailTemplate(url.searchParams.get('template'))

        if (!template) return new Response('Unknown template', { status: 404 })

        const email = template.render(url.origin)
        if (url.searchParams.get('send') === '1') {
          const result = await sendDevTestEmail(email)
          if (result.isErr()) throw result.error

          return Response.redirect(
            `${url.origin}/dev/emails/preview?template=${template.id}&sent=1`,
            303,
          )
        }

        const toolbar = previewToolbar({
          origin: url.origin,
          pathname: url.pathname,
          template: template.id,
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
        const url = new URL(request.url)
        const template = getDevEmailTemplate(url.searchParams.get('template'))

        if (!template) return new Response('Unknown template', { status: 404 })

        const result = await sendDevTestEmail(template.render(url.origin))
        if (result.isErr()) throw result.error

        return Response.redirect(
          `${url.origin}/dev/emails/preview?template=${template.id}&sent=1`,
          303,
        )
      },
    },
  },
})
