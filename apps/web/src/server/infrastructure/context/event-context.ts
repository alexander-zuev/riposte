import { AsyncLocalStorage } from 'node:async_hooks'

import type { DomainEvent } from '@riposte/core'

const eventContext = new AsyncLocalStorage<DomainEvent[]>()

export const runWithEventContext = async <T>(fn: () => Promise<T>): Promise<T> =>
  eventContext.run([], fn)

export const registerEvents = (events: DomainEvent[]): void => {
  const store = eventContext.getStore()
  if (!store) throw new Error('registerEvents called outside UoW')
  store.push(...events)
}

export const getCollectedEvents = (): DomainEvent[] => eventContext.getStore() ?? []
