import type { DomainEvent, UUIDv4 } from '@riposte/core'

/**
 * Base class for entities - objects with identity and lifecycle
 *
 * Concrete implementations must:
 * - Use private constructor
 * - Provide static create() for new entities
 * - Provide static deserialize() for DB/API edge reconstitution
 * - Provide serialize() for persistence
 */
export abstract class Entity<TSerialized> {
  abstract readonly id: UUIDv4

  private pendingEvents: DomainEvent[] = []

  protected addEvent(event: DomainEvent): void {
    this.pendingEvents.push(event)
  }

  collectEvents(): DomainEvent[] {
    return [...this.pendingEvents]
  }

  clearEvents(): void {
    this.pendingEvents = []
  }

  abstract serialize(): TSerialized
}

/**
 * Base class for value objects - immutable objects compared by value
 *
 * Concrete implementations must:
 * - Provide static deserialize() for DB/API edge reconstitution
 * - Provide serialize() for persistence
 */
export abstract class ValueObject<TSerialized> {
  abstract equals(other: unknown): boolean
  abstract serialize(): TSerialized
}
