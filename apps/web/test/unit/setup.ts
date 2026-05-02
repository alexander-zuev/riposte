import { vi } from 'vitest'

vi.mock('@riposte/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@riposte/core')>()
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  }
})
