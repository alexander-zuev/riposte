import type { PropsWithChildren } from 'react'

type Theme = 'light'
import { createContext, use, useMemo } from 'react'

interface ThemeContextVal {
  theme: Theme
}

const ThemeContext = createContext<ThemeContextVal | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo<ThemeContextVal>(() => ({ theme: 'light' }), [])
  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const val = use(ThemeContext)
  if (!val) throw new Error('useTheme called outside of ThemeProvider!')
  return val
}
