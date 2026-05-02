import type { Entity } from '@server/domain/models/base.models'
import { registerEvents } from '@server/infrastructure/context/event-context'

/**
 * Abstract base class for all repositories that work with domain models.
 *
 * Provides dispatchEvents() — call it inside the try block after a successful
 * DB write to atomically collect, register, and clear pending domain events.
 *
 * Pattern:
 *   try {
 *     await tx.insert(...)
 *     this.dispatchEvents(entity)
 *   } catch (e) {
 *     throw new DatabaseError(...)
 *   }
 */
export abstract class BaseRepository {
  protected dispatchEvents(entity: Entity<unknown>): void {
    const events = entity.collectEvents()
    if (events.length > 0) registerEvents(events)
    entity.clearEvents()
  }
}
