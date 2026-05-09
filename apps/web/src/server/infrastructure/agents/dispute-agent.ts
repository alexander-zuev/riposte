import { createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { Agent } from 'agents'

class DisputeAgentBase extends Agent<Env> {}

export type DisputeAgent = DisputeAgentBase

export const DisputeAgent = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  DisputeAgentBase,
)
