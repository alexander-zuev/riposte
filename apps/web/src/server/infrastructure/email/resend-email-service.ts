import { Buffer } from 'node:buffer'

import { EmailServiceError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'
import { Resend } from 'resend'

import type { EmailAttachment, IEmailService } from './interfaces'

export class ResendEmailService implements IEmailService {
  private readonly resend: Resend
  private readonly fromAddress = 'Riposte <noreply@mail.riposte.sh>'

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  async sendEmail(options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    replyTo?: string
    tags?: string[]
    attachments?: EmailAttachment[]
  }): Promise<Result<{ id: string; success: boolean }, EmailServiceError>> {
    const sdkResponse = await Result.tryPromise(
      {
        try: async () =>
          this.resend.emails.send({
            from: this.fromAddress,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
            tags: options.tags?.map((tag) => ({ name: tag, value: tag })),
            attachments: options.attachments?.map((attachment) => ({
              filename: attachment.filename,
              content:
                attachment.content instanceof ArrayBuffer
                  ? Buffer.from(attachment.content)
                  : attachment.content,
              contentType: attachment.contentType,
            })),
          }),
        catch: (cause) =>
          new EmailServiceError({
            message: `Failed to send email to ${String(options.to)}`,
            operation: 'send',
            provider: 'Resend',
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.externalApi,
    )

    if (sdkResponse.isErr()) return Result.err(sdkResponse.error)

    const { data, error } = sdkResponse.value

    if (error) {
      const { name, message } = error
      return Result.err(
        new EmailServiceError({
          message: `Resend ${name}: ${message}`,
          operation: 'send',
          provider: 'Resend',
          cause: error,
          retryable: false,
        }),
      )
    }

    return Result.ok({ id: data.id, success: true })
  }
}
