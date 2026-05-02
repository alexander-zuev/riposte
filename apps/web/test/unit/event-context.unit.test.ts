/**
 * Unit tests for event-context
 *
 * Tests AsyncLocalStorage-based event collection:
 * - registerEvents throws outside context
 * - registerEvents collects events within context
 * - getCollectedEvents returns empty array outside context
 * - Concurrent contexts are isolated
 */
import { describe, expect, it } from 'vitest'

import { createEvent } from '@riposte/core'

import {
  getCollectedEvents,
  registerEvents,
  runWithEventContext,
} from '@server/infrastructure/context/event-context'

const mockEvent = (id: string) =>
  createEvent(
    'UserSignedUp',
    { userId: `user-${id}`, email: `${id}@test.com`, signupMethod: 'google' },
    id as `${string}-${string}-${string}-${string}-${string}`,
  )

describe('event-context', () => {
  describe('registerEvents', () => {
    it('throws when called outside context', () => {
      expect(() => registerEvents([mockEvent('1')])).toThrow('outside UoW')
    })

    it('collects events within context', async () => {
      await runWithEventContext(async () => {
        registerEvents([mockEvent('1')])
        registerEvents([mockEvent('2')])

        const events = getCollectedEvents()
        expect(events).toHaveLength(2)
        expect(events[0]!.id).toBe('1')
        expect(events[1]!.id).toBe('2')
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
      const results = await Promise.all([
        runWithEventContext(async () => {
          registerEvents([mockEvent('a')])
          return getCollectedEvents().map((e) => e.id)
        }),
        runWithEventContext(async () => {
          registerEvents([mockEvent('b')])
          return getCollectedEvents().map((e) => e.id)
        }),
      ])

      expect(results[0]).toEqual(['a'])
      expect(results[1]).toEqual(['b'])
    })

    it('does not leak events between contexts', async () => {
      await runWithEventContext(async () => {
        registerEvents([mockEvent('first')])
      })

      await runWithEventContext(async () => {
        expect(getCollectedEvents()).toEqual([])
      })
    })
  })
})
