import { ValidationError, moneySchema, type Money as SerializedMoney } from '@riposte/core'

import { ValueObject } from '../models/base.models'

export class Money extends ValueObject<SerializedMoney> {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {
    super()
  }

  static create(input: SerializedMoney): Money {
    const parsed = moneySchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError({
        issues: parsed.error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.map((path) => (typeof path === 'symbol' ? String(path) : path)),
          message: issue.message,
        })),
        message: 'Invalid money value',
      })
    }

    return new Money(parsed.data.amountMinor, parsed.data.currency)
  }

  static deserialize(input: SerializedMoney): Money {
    return Money.create(input)
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Money &&
      other.amountMinor === this.amountMinor &&
      other.currency === this.currency
    )
  }

  serialize(): SerializedMoney {
    return {
      amountMinor: this.amountMinor,
      currency: this.currency,
    }
  }
}
