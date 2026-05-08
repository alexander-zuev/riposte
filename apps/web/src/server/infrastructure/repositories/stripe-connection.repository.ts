import type { CredentialEncryptionError } from '@riposte/core'
import { DatabaseError } from '@riposte/core'
import type { IStripeConnectionRepository } from '@server/domain/repository/interfaces'
import type {
  StripeConnection,
  StripeConnectionCredentials,
  StripeConnectionWithCredentials,
  UpsertStripeConnectionInput,
} from '@server/domain/stripe'
import type { ICredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import type { DbStripeConnection, DrizzleDb } from '@server/infrastructure/db'
import { stripeConnections } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { desc, eq } from 'drizzle-orm'

export class StripeConnectionRepository implements IStripeConnectionRepository {
  constructor(
    private readonly db: DrizzleDb,
    private readonly credentialEncryption: ICredentialEncryptionService,
  ) {}

  async upsertConnectedAccount(
    input: UpsertStripeConnectionInput,
  ): Promise<Result<StripeConnection, DatabaseError | CredentialEncryptionError>> {
    const encryptedCredential = await this.credentialEncryption.encrypt({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    })
    if (encryptedCredential.isErr()) return Result.err(encryptedCredential.error)

    const saved = await Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .insert(stripeConnections)
          .values({
            userId: input.userId,
            stripeAccountId: input.stripeAccountId,
            stripeBusinessName: input.stripeBusinessName,
            livemode: input.livemode,
            scope: input.scope,
            tokenType: input.tokenType,
            credentialCiphertext: encryptedCredential.value.ciphertext,
            credentialIv: encryptedCredential.value.iv,
            credentialKeyVersion: encryptedCredential.value.keyVersion,
            accessTokenExpiresAt: input.accessTokenExpiresAt,
            connectedAt: input.connectedAt,
          })
          .onConflictDoUpdate({
            target: [stripeConnections.stripeAccountId, stripeConnections.livemode],
            set: {
              userId: input.userId,
              stripeBusinessName: input.stripeBusinessName,
              scope: input.scope,
              tokenType: input.tokenType,
              credentialCiphertext: encryptedCredential.value.ciphertext,
              credentialIv: encryptedCredential.value.iv,
              credentialKeyVersion: encryptedCredential.value.keyVersion,
              accessTokenExpiresAt: input.accessTokenExpiresAt,
              connectedAt: input.connectedAt,
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!connection) throw new Error('Stripe connection upsert returned no rows')

        return connection
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to upsert Stripe connection', cause }),
    })

    if (saved.isErr()) return saved
    return Result.ok(this.toDomain(saved.value))
  }

  async findByStripeAccountId(
    stripeAccountId: string,
  ): Promise<Result<StripeConnection | null, DatabaseError>> {
    const found = await this.findDbByStripeAccountId(stripeAccountId)
    if (found.isErr()) return found
    return Result.ok(found.value ? this.toDomain(found.value) : null)
  }

  async findLatestByUserId(
    userId: string,
  ): Promise<Result<StripeConnection | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .select()
          .from(stripeConnections)
          .where(eq(stripeConnections.userId, userId))
          .orderBy(desc(stripeConnections.connectedAt))
          .limit(1)

        return connection ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe connection by user', cause }),
    })

    if (found.isErr()) return found
    return Result.ok(found.value ? this.toDomain(found.value) : null)
  }

  async findWithCredentialsByStripeAccountId(
    stripeAccountId: string,
  ): Promise<
    Result<StripeConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  > {
    const found = await this.findDbByStripeAccountId(stripeAccountId)
    if (found.isErr()) return Result.err(found.error)
    if (!found.value) return Result.ok(null)

    const credentials = await this.credentialEncryption.decrypt<StripeConnectionCredentials>({
      ciphertext: found.value.credentialCiphertext,
      iv: found.value.credentialIv,
      keyVersion: found.value.credentialKeyVersion,
    })
    if (credentials.isErr()) return Result.err(credentials.error)

    return Result.ok({
      ...this.toDomain(found.value),
      ...credentials.value,
    })
  }

  private async findDbByStripeAccountId(
    stripeAccountId: string,
  ): Promise<Result<DbStripeConnection | null, DatabaseError>> {
    return Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .select()
          .from(stripeConnections)
          .where(eq(stripeConnections.stripeAccountId, stripeAccountId))
          .limit(1)

        return connection ?? null
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to find Stripe connection', cause }),
    })
  }

  private toDomain(connection: DbStripeConnection): StripeConnection {
    return {
      id: connection.id,
      userId: connection.userId,
      stripeAccountId: connection.stripeAccountId,
      stripeBusinessName: connection.stripeBusinessName,
      livemode: connection.livemode,
      scope: connection.scope,
      tokenType: connection.tokenType,
      accessTokenExpiresAt: connection.accessTokenExpiresAt,
      connectedAt: connection.connectedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  }
}
