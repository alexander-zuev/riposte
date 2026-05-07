import type { EmailServiceError } from '@riposte/core'
import type { Result } from 'better-result'

export type MimeType = `${string}/${string}`

export interface EmailAttachment {
  filename: string
  content: string | Buffer | ArrayBuffer
  contentType?: MimeType
}

export interface IEmailService {
  sendEmail: (options: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    replyTo?: string
    tags?: string[]
    attachments?: EmailAttachment[]
  }) => Promise<Result<{ id: string; success: boolean }, EmailServiceError>>
}
