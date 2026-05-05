/**
 * App Routes Configuration
 *
 * Centralized definition of all application routes with proper typing.
 * Used by worker, frontend, and API clients for consistency.
 */

export const APP_ROUTES = {
  auth: {
    basePath: '/api/auth',
  },
} as const
