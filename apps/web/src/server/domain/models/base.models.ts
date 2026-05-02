import type { DomainEvent, UUIDv4 } from '@riposte/core'

/**
 * Base class for entities - objects with identity and lifecycle
 *
 * Concrete implementations must:
 * - Use private constructor
 * - Provide static create() for new entities
 * - Provide static fromPersistence() for DB reconstitution
 * - Provide toData() for serialization
 */
export abstract class Entity<TData> {
  abstract readonly id: UUIDv4

  private _events: DomainEvent[] = []

  protected addEvent(event: DomainEvent): void {
    this._events.push(event)
  }

  collectEvents(): DomainEvent[] {
    return [...this._events]
  }

  clearEvents(): void {
    this._events = []
  }

  abstract toData(): TData
}

/**
 * Base class for value objects - immutable objects compared by value
 *
 * Concrete implementations must:
 * - Provide static fromPersistence() for DB reconstitution
 * - Provide toData() for serialization
 */
export abstract class ValueObject<TData> {
  abstract equals(other: ValueObject<TData>): boolean
  abstract toData(): TData
}
