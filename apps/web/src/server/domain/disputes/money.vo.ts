import { ValidationError } from '@riposte/core'

import { ValueObject } from '../models/base.models'

export type SerializedMoney = {
  amountMinor: number
  currency: string
}

export class Money extends ValueObject<SerializedMoney> {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {
    super()
  }

  static create(input: SerializedMoney): Money {
    const currency = input.currency.trim().toLowerCase()

    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new ValidationError({
        issues: [
          {
            code: 'invalid_money_amount',
            path: ['amountMinor'],
            message: 'Money amount must be a non-negative integer in minor units',
          },
        ],
      })
    }

    if (!/^[a-z]{3}$/.test(currency)) {
      throw new ValidationError({
        issues: [
          {
            code: 'invalid_currency',
            path: ['currency'],
            message: 'Currency must be a three-letter ISO currency code',
          },
        ],
      })
    }

    return new Money(input.amountMinor, currency)
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
