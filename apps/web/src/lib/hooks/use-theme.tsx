import { rootRouteId, useRouter } from '@tanstack/react-router'
import type { Theme } from '@web/server/entrypoints/functions/theme.fn'
import { setThemeServerFn } from '@web/server/entrypoints/functions/theme.fn'
import type { PropsWithChildren } from 'react'
import { createContext, use, useCallback, useMemo } from 'react'

interface ThemeContextVal {
  theme: Theme
  setTheme: (val: Theme) => void
}

const ThemeContext = createContext<ThemeContextVal | null>(null)

export function ThemeProvider({ children, theme }: PropsWithChildren<{ theme: Theme }>) {
  const router = useRouter()

  const setTheme = useCallback(
    (val: Theme) => {
      setThemeServerFn({ data: val })
        .then(async () =>
          router.invalidate({
            filter: (match) => match.id === rootRouteId,
          }),
        )
        .catch(() => {})
    },
    [router],
  )

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const val = use(ThemeContext)
  if (!val) throw new Error('useTheme called outside of ThemeProvider!')
  return val
}
