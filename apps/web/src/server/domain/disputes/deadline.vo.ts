import { ValidationError } from '@riposte/core'

import { ValueObject } from '../models/base.models'

export class Deadline extends ValueObject<Date> {
  private constructor(readonly value: Date) {
    super()
  }

  static create(value: Date | string): Deadline {
    const date = value instanceof Date ? value : new Date(value)

    if (Number.isNaN(date.getTime())) {
      throw new ValidationError({
        issues: [
          {
            code: 'invalid_deadline',
            path: ['evidenceDueBy'],
            message: 'Deadline must be a valid date',
          },
        ],
      })
    }

    return new Deadline(date)
  }

  static deserialize(value: Date | string): Deadline {
    return Deadline.create(value)
  }

  isPast(now: Date): boolean {
    return this.value.getTime() <= now.getTime()
  }

  equals(other: unknown): boolean {
    return other instanceof Deadline && other.value.getTime() === this.value.getTime()
  }

  serialize(): Date {
    return this.value
  }

  toISOString(): string {
    return this.value.toISOString()
  }
}
