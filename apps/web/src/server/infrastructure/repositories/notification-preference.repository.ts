import { DatabaseError } from '@riposte/core'
import type {
  NotificationChannelPreference,
  NotificationRecipient,
  SetNotificationChannelPreferenceInput,
} from '@server/domain/notifications'
import type { INotificationPreferenceRepository } from '@server/domain/repository/interfaces'
import type { DbNotificationPreference, DrizzleDb } from '@server/infrastructure/db'
import { notificationPreferences, user } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { eq } from 'drizzle-orm'

export class NotificationPreferenceRepository implements INotificationPreferenceRepository {
  constructor(private readonly db: DrizzleDb) {}

  async findForUser(
    userId: string,
  ): Promise<Result<NotificationChannelPreference[], DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () =>
        await this.db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId)),
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find notification preferences', cause }),
    })

    if (found.isErr()) return Result.err(found.error)

    return Result.ok(found.value.map((preference) => this.toDomain(preference)))
  }

  async findRecipientByUserId(
    userId: string,
  ): Promise<Result<NotificationRecipient | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select({
            userId: user.id,
            name: user.name,
            email: user.email,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1)

        return row ?? null
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to find notification recipient', cause }),
    })

    if (found.isErr()) return Result.err(found.error)
    return Result.ok(found.value)
  }

  async setChannelEnabled(
    input: SetNotificationChannelPreferenceInput,
  ): Promise<Result<NotificationChannelPreference, DatabaseError>> {
    const saved = await Result.tryPromise({
      try: async () => {
        const [preference] = await this.db
          .insert(notificationPreferences)
          .values(input)
          .onConflictDoUpdate({
            target: [notificationPreferences.userId, notificationPreferences.channel],
            set: {
              enabled: input.enabled,
              updatedAt: new Date(),
            },
          })
          .returning()

        if (!preference) throw new Error('Notification preference upsert returned no rows')

        return preference
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to set notification preference', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(this.toDomain(saved.value))
  }

  private toDomain(preference: DbNotificationPreference): NotificationChannelPreference {
    return {
      userId: preference.userId,
      channel: preference.channel,
      enabled: preference.enabled,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    }
  }
}
