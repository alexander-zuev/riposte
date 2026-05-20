/**
 * PostHog Analytics Configuration
 *
 * Centralized configuration for PostHog integration.
 * Values here are constants that never change across environments.
 */

export const POSTHOG_CONFIG = {
  /**
   * PostHog US Cloud ingest host
   * - Same for all environments (dev, preview, production)
   * - Server-side direct ingest (the browser client uses relay.riposte.sh)
   */
  HOST: 'https://us.i.posthog.com',
} as const
