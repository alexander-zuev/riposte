import { z } from 'zod'

export const currencyCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{3}$/, 'Currency must be a three-letter ISO currency code')

export const moneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: currencyCodeSchema,
})

export type CurrencyCode = z.infer<typeof currencyCodeSchema>
export type Money = z.infer<typeof moneySchema>
