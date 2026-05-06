import { DatabaseError } from '@riposte/core'
import type { IWaitlistRepository } from '@server/domain/repository/interfaces'
import type { DrizzleDb } from '@server/infrastructure/db'
import { waitlist } from '@server/infrastructure/db'
import { Result } from 'better-result'

export class WaitlistRepository implements IWaitlistRepository {
  constructor(private readonly db: DrizzleDb) {}

  async addEmail(email: string): Promise<Result<{ alreadyExists: boolean }, DatabaseError>> {
    return Result.tryPromise({
      try: async () => {
        const inserted = await this.db
          .insert(waitlist)
          .values({ email })
          .onConflictDoNothing()
          .returning({ id: waitlist.id })
        return { alreadyExists: inserted.length === 0 }
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to add email to waitlist', cause }),
    })
  }
}
