import { DatabaseError } from '@riposte/core'
import type { DrizzleDb } from '@server/infrastructure/db'
import { waitlist } from '@server/infrastructure/db'

export class WaitlistRepository {
  constructor(private readonly db: DrizzleDb) {}

  async addEmail(email: string): Promise<{ alreadyExists: boolean }> {
    try {
      const inserted = await this.db
        .insert(waitlist)
        .values({ email })
        .onConflictDoNothing()
        .returning({ id: waitlist.id })
      return { alreadyExists: inserted.length === 0 }
    } catch (e) {
      throw new DatabaseError('Failed to add email to waitlist', e)
    }
  }
}
