import { withDepsRequest } from './deps.middleware'
import { routeErrorMiddleware } from './error.middleware'

export { errorMiddleware, routeErrorMiddleware } from './error.middleware'
export { withDeps, withDepsRequest } from './deps.middleware'

export const apiRouteWithDepsMiddleware = [routeErrorMiddleware, withDepsRequest] as const
export { extractAuth, requireAuth } from './auth.middleware'
