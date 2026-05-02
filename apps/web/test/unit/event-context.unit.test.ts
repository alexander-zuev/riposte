import type { UUIDv4 } from '@riposte/core'
import {
  getCollectedEvents,
  registerEvents,
  runWithEventContext,
} from '@server/infrastructure/context/event-context'
import { describe, expect, it } from 'vitest'

import { testEvent } from '../mocks'

describe('event-context', () => {
  describe('registerEvents', () => {
    it('throws when called outside context', () => {
      expect(() => registerEvents([testEvent()])).toThrow('outside UoW')
    })

    it('collects events within context', async () => {
      const evt1 = testEvent({ id: '00000000-0000-0000-0000-000000000001' as UUIDv4 })
      const evt2 = testEvent({ id: '00000000-0000-0000-0000-000000000002' as UUIDv4 })

      await runWithEventContext(async () => {
        registerEvents([evt1])
        registerEvents([evt2])

        const events = getCollectedEvents()
        expect(events).toHaveLength(2)
        expect(events[0]!.id).toBe(evt1.id)
        expect(events[1]!.id).toBe(evt2.id)
      })
    })
  })

  describe('getCollectedEvents', () => {
    it('returns empty array outside context', () => {
      expect(getCollectedEvents()).toEqual([])
    })

    it('returns empty array for fresh context', async () => {
      await runWithEventContext(async () => {
        expect(getCollectedEvents()).toEqual([])
      })
    })
  })

  describe('context isolation', () => {
    it('isolates concurrent contexts', async () => {
      const evtA = testEvent({ id: '00000000-0000-0000-0000-00000000000a' as UUIDv4 })
      const evtB = testEvent({ id: '00000000-0000-0000-0000-00000000000b' as UUIDv4 })

      const results = await Promise.all([
        runWithEventContext(async () => {
          registerEvents([evtA])
          return getCollectedEvents().map((e) => e.id)
        }),
        runWithEventContext(async () => {
          registerEvents([evtB])
          return getCollectedEvents().map((e) => e.id)
        }),
      ])

      expect(results[0]).toEqual([evtA.id])
      expect(results[1]).toEqual([evtB.id])
    })

    it('does not leak events between contexts', async () => {
      await runWithEventContext(async () => {
        registerEvents([testEvent()])
      })

      await runWithEventContext(async () => {
        expect(getCollectedEvents()).toEqual([])
      })
    })
  })
})
