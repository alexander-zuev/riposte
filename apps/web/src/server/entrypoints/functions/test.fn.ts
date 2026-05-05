import { Result } from 'better-result'
import { createServerFn } from '@tanstack/react-start'

export const testResultRaw = createServerFn().handler(async () => {
  const result = Result.ok({ message: 'hello from server', timestamp: Date.now() })
  return result
})

export const testResultErrRaw = createServerFn().handler(async () => {
  const result = Result.err(new Error('something went wrong'))
  return result
})

export const testResultSerialized = createServerFn().handler(async () => {
  const result = Result.ok({ message: 'hello serialized', timestamp: Date.now() })
  return Result.serialize(result)
})

export const testResultErrSerialized = createServerFn().handler(async () => {
  const result = Result.err(new Error('serialized error'))
  return Result.serialize(result)
})
