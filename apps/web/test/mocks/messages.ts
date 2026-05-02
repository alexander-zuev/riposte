import { createCommand, createEvent, createQuery } from '@riposte/core'
import type { UUIDv4 } from '@riposte/core'

export function testCommand(overrides?: { id?: UUIDv4; email?: string; userName?: string }) {
  return createCommand(
    'SendWelcomeEmail',
    {
      email: overrides?.email ?? 'test@example.com',
      userName: overrides?.userName,
    },
    overrides?.id,
  )
}

export function testEvent(overrides?: {
  id?: UUIDv4
  userId?: string
  email?: string
  signupMethod?: 'google' | 'github' | 'email_password'
}) {
  return createEvent(
    'UserSignedUp',
    {
      userId: overrides?.userId ?? 'user-test',
      email: overrides?.email ?? 'test@example.com',
      signupMethod: overrides?.signupMethod ?? 'google',
    },
    overrides?.id,
  )
}

export function testR2Event(overrides?: { id?: UUIDv4; payload?: Record<string, unknown> }) {
  return createEvent('R2Event', { payload: overrides?.payload ?? {} }, overrides?.id)
}

export function testQuery(overrides?: { userId?: string }) {
  return createQuery('GetSessionStatus', {
    userId: overrides?.userId ?? 'user-test',
  })
}
