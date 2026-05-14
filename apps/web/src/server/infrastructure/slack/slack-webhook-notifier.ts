import { SlackApiError } from '@riposte/core'
import { slackRequest } from '@server/infrastructure/slack/slack-request'
import { IncomingWebhook, type IncomingWebhookSendArguments } from '@slack/webhook'
import { Result } from 'better-result'

export type SlackWebhookMessage = {
  text: string
  blocks?: unknown[]
}

export interface ISlackWebhookNotifier {
  send: (webhookUrl: string, message: SlackWebhookMessage) => Promise<Result<void, SlackApiError>>
}

export class SlackWebhookNotifier implements ISlackWebhookNotifier {
  async send(
    webhookUrl: string,
    message: SlackWebhookMessage,
  ): Promise<Result<void, SlackApiError>> {
    const sent = await slackRequest('incoming_webhook.send', async () => {
      const webhook = new IncomingWebhook(webhookUrl)
      await webhook.send(message as IncomingWebhookSendArguments)
    })
    if (sent.isErr()) return Result.err(sent.error)

    return Result.ok(undefined)
  }
}
