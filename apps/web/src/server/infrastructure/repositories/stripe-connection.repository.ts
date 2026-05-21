import type { CredentialEncryptionError, UUIDv4 } from '@riposte/core'
import { DatabaseError } from '@riposte/core'
import type { IStripeConnectionRepository } from '@server/domain/repository/interfaces'
import {
  StripeConnection,
  type StripeConnectionCredentials,
  type StripeConnectionWithCredentials,
} from '@server/domain/stripe'
import type { ICredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import type { DbStripeConnection, DrizzleDb } from '@server/infrastructure/db'
import { stripeConnections } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { desc, eq } from 'drizzle-orm'

import { BaseRepository } from './base.repository'

export class StripeConnectionRepository
  extends BaseRepository
  implements IStripeConnectionRepository
{
  constructor(
    private readonly db: DrizzleDb,
    private readonly credentialEncryption: ICredentialEncryptionService,
  ) {
    super()
  }

  async save(connection: StripeConnection): Promise<Result<StripeConnection, DatabaseError>> {
    const row = connection.serialize()

    const saved = await Result.tryPromise({
      try: async () => {
        const [savedConnection] = await this.db
          .update(stripeConnections)
          .set({
            userId: row.userId,
            productId: row.productId,
            stripeBusinessName: row.stripeBusinessName,
            livemode: row.livemode,
            status: row.status,
            scope: row.scope,
            tokenType: row.tokenType,
            accessTokenExpiresAt: row.accessTokenExpiresAt,
            connectedAt: row.connectedAt,
            revokedAt: row.revokedAt,
            revokedStripeEventId: row.revokedStripeEventId,
            updatedAt: row.updatedAt,
          })
          .where(eq(stripeConnections.id, row.id))
          .returning()

        if (!savedConnection) throw new Error('Stripe connection save returned no row')
        this.dispatchEvents(connection)
        return savedConnection
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to save Stripe connection', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(StripeConnection.deserialize(saved.value))
  }

  async saveWithCredentials(
    connection: StripeConnection,
    credentials: StripeConnectionCredentials,
  ): Promise<Result<StripeConnection, DatabaseError | CredentialEncryptionError>> {
    const encryptedCredential = await this.credentialEncryption.encrypt({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
    })
    if (encryptedCredential.isErr()) return Result.err(encryptedCredential.error)

    const row = connection.serialize()

    const saved = await Result.tryPromise({
      try: async () => {
        const [savedConnection] = await this.db
          .insert(stripeConnections)
          .values({
            id: row.id,
            userId: row.userId,
            productId: row.productId,
            stripeAccountId: row.stripeAccountId,
            stripeBusinessName: row.stripeBusinessName,
            livemode: row.livemode,
            status: row.status,
            scope: row.scope,
            tokenType: row.tokenType,
            credentialCiphertext: encryptedCredential.value.ciphertext,
            credentialIv: encryptedCredential.value.iv,
            credentialKeyVersion: encryptedCredential.value.keyVersion,
            accessTokenExpiresAt: row.accessTokenExpiresAt,
            connectedAt: row.connectedAt,
            revokedAt: row.revokedAt,
            revokedStripeEventId: row.revokedStripeEventId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .onConflictDoUpdate({
            target: [stripeConnections.stripeAccountId, stripeConnections.livemode],
            set: {
              userId: row.userId,
              productId: row.productId,
              stripeBusinessName: row.stripeBusinessName,
              status: row.status,
              scope: row.scope,
              tokenType: row.tokenType,
              credentialCiphertext: encryptedCredential.value.ciphertext,
              credentialIv: encryptedCredential.value.iv,
              credentialKeyVersion: encryptedCredential.value.keyVersion,
              accessTokenExpiresAt: row.accessTokenExpiresAt,
              connectedAt: row.connectedAt,
              revokedAt: row.revokedAt,
              revokedStripeEventId: row.revokedStripeEventId,
              updatedAt: row.updatedAt,
            },
          })
          .returning()

        if (!savedConnection) throw new Error('Stripe connection save returned no row')
        this.dispatchEvents(connection)
        return savedConnection
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to save Stripe connection credentials', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(StripeConnection.deserialize(saved.value))
  }

  async findByStripeAccountId(
    stripeAccountId: string,
  ): Promise<Result<StripeConnection | null, DatabaseError>> {
    const found = await this.findDbByStripeAccountId(stripeAccountId)
    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value ? StripeConnection.deserialize(found.value) : null)
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

    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value ? StripeConnection.deserialize(found.value) : null)
  }

  async findByProductId(
    productId: UUIDv4,
  ): Promise<Result<StripeConnection | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [connection] = await this.db
          .select()
          .from(stripeConnections)
          .where(eq(stripeConnections.productId, productId))
          .limit(1)

        return connection ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find Stripe connection by product', cause }),
    })

    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value ? StripeConnection.deserialize(found.value) : null)
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

    return Result.ok(
      StripeConnection.withCredentials(
        StripeConnection.deserialize(found.value),
        credentials.value,
      ),
    )
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
}
