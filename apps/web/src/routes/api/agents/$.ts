import { AuthorizationError, EntityNotFoundError } from '@riposte/core'
import { apiErrorResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware, requireAuth } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { routeAgentRequest } from 'agents'
import { env } from 'cloudflare:workers'

/**
 * Catch-all for Cloudflare Agents SDK WebSocket + HTTP transport.
 *
 * URL shape: `/api/agents/{kebab-class-name}/{productId}`.
 * GET handles the WebSocket upgrade and SSE; POST handles HTTP-transport
 * messages and tool result callbacks from the SDK.
 *
 * Auth: logged-in user must own the target product.
 */
export const Route = createFileRoute('/api/agents/$')({
  server: {
    middleware: [...apiRouteWithDepsMiddleware, requireAuth],
    handlers: {
      GET: async ({ request, context }) => {
        const productId = extractProductId(request)
        if (!productId) return apiErrorResponse(new EntityNotFoundError({ entity: 'product' }))

        const found = await context.deps.repos.products(context.deps.db()).findById(productId)
        if (found.isErr()) return apiErrorResponse(found.error)
        if (!found.value || found.value.userId !== context.user.id) {
          return apiErrorResponse(new AuthorizationError())
        }

        const response = await routeAgentRequest(request, env, {
          prefix: 'api/agents',
          props: { userId: context.user.id },
        })
        return response ?? apiErrorResponse(new EntityNotFoundError({ entity: 'agent' }))
      },
      POST: async ({ request, context }) => {
        const productId = extractProductId(request)
        if (!productId) return apiErrorResponse(new EntityNotFoundError({ entity: 'product' }))

        const found = await context.deps.repos.products(context.deps.db()).findById(productId)
        if (found.isErr()) return apiErrorResponse(found.error)
        if (!found.value || found.value.userId !== context.user.id) {
          return apiErrorResponse(new AuthorizationError())
        }

        const response = await routeAgentRequest(request, env, {
          prefix: 'api/agents',
          props: { userId: context.user.id },
        })
        return response ?? apiErrorResponse(new EntityNotFoundError({ entity: 'agent' }))
      },
    },
  },
})

/** URL shape: `/api/agents/{kebab-class-name}/{productId}/...` */
function extractProductId(request: Request): string | undefined {
  return new URL(request.url).pathname.split('/')[4]
}
