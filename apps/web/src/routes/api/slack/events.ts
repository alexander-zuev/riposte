import { createCommand, createLogger } from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { apiRouteWithDepsMiddleware } from '@server/infrastructure/middleware'
import { verifySlackRequestSignature } from '@server/infrastructure/slack/slack-signature'
import { createFileRoute } from '@tanstack/react-router'
import { Result } from 'better-result'

const logger = createLogger('slack-events')

type SlackEventsPayload =
  | {
      type: 'url_verification'
      challenge: string
    }
  | {
      type: 'event_callback'
      team_id?: string
      event?: {
        type?: string
      }
    }

export const Route = createFileRoute('/api/slack/events')({
  server: {
    middleware: apiRouteWithDepsMiddleware,
    handlers: {
      POST: async ({ request, context }) => {
        const config = getServerConfig()
        const body = await request.text()
        const verified = await verifySlackRequestSignature({
          body,
          timestamp: request.headers.get('x-slack-request-timestamp'),
          signature: request.headers.get('x-slack-signature'),
          signingSecret: config.slack.signingSecret,
        })
        if (verified.isErr()) {
          logger.warn('slack_events_invalid_signature', { error: verified.error })
          return new Response('invalid signature', { status: 401 })
        }

        const parsed = Result.try({
          try: () => JSON.parse(body) as SlackEventsPayload,
          catch: (cause) => new Error('Invalid Slack events payload', { cause }),
        })
        if (parsed.isErr()) return new Response('invalid payload', { status: 400 })

        if (parsed.value.type === 'url_verification') {
          return Response.json({ challenge: parsed.value.challenge })
        }

        if (parsed.value.type !== 'event_callback') return Response.json({ ok: true })
        if (parsed.value.event?.type !== 'app_uninstalled') return Response.json({ ok: true })

        if (!parsed.value.team_id) {
          logger.warn('slack_app_uninstalled_missing_team_id')
          return new Response('missing team_id', { status: 400 })
        }

        const command = createCommand(
          'HandleSlackAppUninstalled',
          { teamId: parsed.value.team_id },
          `slack:${parsed.value.team_id}:app_uninstalled`,
        )
        const result = await context.deps.services.messageBus().handle(command)

        return resultToApiResponse(result, {
          ok: () => Response.json({ ok: true }),
          err: (error) => {
            logger.error('slack_app_uninstalled_command_failed', { error })
            return Response.json({ ok: false }, { status: 500 })
          },
        })
      },
    },
  },
})
