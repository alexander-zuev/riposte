import { SlackOAuthCallbackError } from '@riposte/core'
import { slackRequest } from '@server/infrastructure/slack/slack-request'
import { WebClient, type OauthV2AccessResponse } from '@slack/web-api'
import { Result } from 'better-result'

export type SlackOAuthToken = {
  teamId: string
  teamName: string | null
  channelId: string | null
  channelName: string | null
  webhookUrl: string
}

export type SlackOAuthClientConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export async function exchangeSlackOAuthCode(
  input: SlackOAuthClientConfig & { code: string },
): Promise<Result<SlackOAuthToken, SlackOAuthCallbackError>> {
  const response = await slackRequest('oauth.v2.access', async () => {
    const client = new WebClient()
    return await client.oauth.v2.access({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    })
  })
  if (response.isErr()) {
    return Result.err(
      new SlackOAuthCallbackError({
        reason: 'oauth_token_failed',
        cause: response.error,
        message: response.error.message,
      }),
    )
  }

  const payload = response.value
  if (!payload.team?.id) {
    return Result.err(new SlackOAuthCallbackError({ reason: 'invalid_token_response' }))
  }

  const webhookUrl = payload.incoming_webhook?.url
  if (!webhookUrl) {
    return Result.err(new SlackOAuthCallbackError({ reason: 'missing_incoming_webhook' }))
  }

  return Result.ok({
    teamId: payload.team.id,
    teamName: payload.team.name ?? null,
    channelId: payload.incoming_webhook?.channel_id ?? null,
    channelName: payload.incoming_webhook?.channel ?? null,
    webhookUrl,
  })
}
