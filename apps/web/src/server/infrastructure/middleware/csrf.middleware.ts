import { createCsrfMiddleware } from '@tanstack/react-start'

// Server functions are same-origin RPC endpoints. Defaults verify
// Sec-Fetch-Site is 'same-origin' and fall back to Origin/Referer
// checks against the request URL. API routes (webhooks, OAuth callbacks)
// are excluded via the handlerType filter and handle their own auth.
export const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})
