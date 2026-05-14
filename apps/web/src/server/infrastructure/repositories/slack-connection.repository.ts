import type { CredentialEncryptionError } from '@riposte/core'
import { DatabaseError } from '@riposte/core'
import type { ISlackConnectionRepository } from '@server/domain/repository/interfaces'
import type {
  SlackConnection,
  SlackConnectionWithCredentials,
  SlackIncomingWebhookCredentials,
  UpsertSlackConnectionInput,
} from '@server/domain/slack'
import type { ICredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import type { DbSlackConnection, DrizzleDb } from '@server/infrastructure/db'
import { slackConnections } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { desc, eq } from 'drizzle-orm'

export class SlackConnectionRepository implements ISlackConnectionRepository {
  constructor(
    private readonly db: DrizzleDb,
    private readonly credentialEncryption: ICredentialEncryptionService,
  ) {}

  async upsertInstalledConnection(
    input: UpsertSlackConnectionInput,
  ): Promise<Result<SlackConnection, DatabaseError | CredentialEncryptionError>> {
    const encryptedCredential = await this.credentialEncryption.encrypt({
      webhookUrl: input.webhookUrl,
    })
    if (encryptedCredential.isErr()) return Result.err(encryptedCredential.error)

    const saved = await Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .insert(slackConnections)
          .values({
            userId: input.userId,
            teamId: input.teamId,
            teamName: input.teamName,
            channelId: input.channelId,
            channelName: input.channelName,
            status: 'active',
            failureReason: null,
            webhookCiphertext: encryptedCredential.value.ciphertext,
            webhookIv: encryptedCredential.value.iv,
            webhookKeyVersion: encryptedCredential.value.keyVersion,
            connectedAt: input.connectedAt,
            failedAt: null,
          })
          .onConflictDoUpdate({
            target: [slackConnections.userId, slackConnections.teamId],
            set: {
              teamName: input.teamName,
              channelId: input.channelId,
              channelName: input.channelName,
              status: 'active',
              failureReason: null,
              webhookCiphertext: encryptedCredential.value.ciphertext,
              webhookIv: encryptedCredential.value.iv,
              webhookKeyVersion: encryptedCredential.value.keyVersion,
              connectedAt: input.connectedAt,
              failedAt: null,
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!connection) throw new Error('Slack connection upsert returned no rows')

        return connection
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to upsert Slack connection', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(this.toDomain(saved.value))
  }

  async findLatestByUserId(userId: string): Promise<Result<SlackConnection | null, DatabaseError>> {
    const found = await this.findLatestDbByUserId(userId)
    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value ? this.toDomain(found.value) : null)
  }

  async findWithCredentialsByUserId(
    userId: string,
  ): Promise<
    Result<SlackConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  > {
    const found = await this.findLatestDbByUserId(userId)
    if (found.isErr()) return Result.err(found.error)
    if (!found.value) return Result.ok(null)

    const credentials = await this.credentialEncryption.decrypt<SlackIncomingWebhookCredentials>({
      ciphertext: found.value.webhookCiphertext,
      iv: found.value.webhookIv,
      keyVersion: found.value.webhookKeyVersion,
    })
    if (credentials.isErr()) return Result.err(credentials.error)

    return Result.ok({
      ...this.toDomain(found.value),
      webhookUrl: credentials.value.webhookUrl,
    })
  }

  async markFailedByTeamId(input: {
    teamId: string
    failureReason: string
    failedAt: Date
  }): Promise<Result<SlackConnection[], DatabaseError>> {
    const saved = await Result.tryPromise({
      try: async () =>
        await this.db
          .update(slackConnections)
          .set({
            status: 'failed',
            failureReason: input.failureReason,
            failedAt: input.failedAt,
            updatedAt: new Date(),
          })
          .where(eq(slackConnections.teamId, input.teamId))
          .returning(),
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to mark Slack connection failed', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(saved.value.map((connection) => this.toDomain(connection)))
  }

  private async findLatestDbByUserId(
    userId: string,
  ): Promise<Result<DbSlackConnection | null, DatabaseError>> {
    return Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .select()
          .from(slackConnections)
          .where(eq(slackConnections.userId, userId))
          .orderBy(desc(slackConnections.connectedAt))
          .limit(1)

        return connection ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Slack connection by user', cause }),
    })
  }

  private toDomain(connection: DbSlackConnection): SlackConnection {
    return {
      id: connection.id,
      userId: connection.userId,
      teamId: connection.teamId,
      teamName: connection.teamName,
      channelId: connection.channelId,
      channelName: connection.channelName,
      status: connection.status,
      failureReason: connection.failureReason,
      connectedAt: connection.connectedAt,
      failedAt: connection.failedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  }
}
