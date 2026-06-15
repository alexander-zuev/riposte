import { withAnalyticsRequestDepsContext } from './analytics.middleware'
import { routeErrorMiddleware } from './error.middleware'
import { requireStripeAppSignature, stripeAppCorsMiddleware } from './stripe-app.middleware'

export {
  withAnalyticsFunctionContext,
  withAnalyticsRequestDepsContext,
} from './analytics.middleware'
export { errorMiddleware, routeErrorMiddleware } from './error.middleware'
export {
  devOnlyFunctionMiddleware,
  devOnlyNotFoundResponse,
  devOnlyRequestMiddleware,
  isDevOrTestRuntime,
  requireDevOrTestRuntime,
} from './dev-only.middleware'
export { requireStripeAppSignature, stripeAppCorsMiddleware } from './stripe-app.middleware'

export const apiRouteWithDepsMiddleware = [
  routeErrorMiddleware,
  withAnalyticsRequestDepsContext,
] as const
export const stripeAppApiMiddleware = [
  stripeAppCorsMiddleware,
  routeErrorMiddleware,
  requireStripeAppSignature,
  withAnalyticsRequestDepsContext,
] as const
export { extractAuth, requireAuth } from './auth.middleware'
