import { withDepsRequest } from './deps.middleware'
import { routeErrorMiddleware } from './error.middleware'
import { requireStripeAppSignature, stripeAppCorsMiddleware } from './stripe-app.middleware'

export { errorMiddleware, routeErrorMiddleware } from './error.middleware'
export { withDeps, withDepsRequest } from './deps.middleware'
export {
  devOnlyFunctionMiddleware,
  devOnlyNotFoundResponse,
  devOnlyRequestMiddleware,
  isDevOrTestRuntime,
  requireDevOrTestRuntime,
} from './dev-only.middleware'
export { requireStripeAppSignature, stripeAppCorsMiddleware } from './stripe-app.middleware'

export const apiRouteWithDepsMiddleware = [routeErrorMiddleware, withDepsRequest] as const
export const stripeAppApiMiddleware = [
  stripeAppCorsMiddleware,
  routeErrorMiddleware,
  requireStripeAppSignature,
  withDepsRequest,
] as const
export { extractAuth, requireAuth } from './auth.middleware'
