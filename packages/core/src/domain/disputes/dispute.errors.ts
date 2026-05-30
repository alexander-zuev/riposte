import { TaggedError } from 'better-result'

export class DisputeSyncLimitExceededError extends TaggedError('DisputeSyncLimitExceededError')<{
  message: string
  stripeAccountId: string
  livemode: boolean
  limit: number
  retryable: false
}>() {
  constructor(args: { stripeAccountId: string; livemode: boolean; limit: number }) {
    super({
      ...args,
      message: `Stripe dispute sync exceeded ${args.limit} disputes`,
      retryable: false,
    })
  }
}
