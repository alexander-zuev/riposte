import { cn } from '@web/lib/utils'
import { useLayoutEffect } from 'react'

import { SiteFrame, SiteFrameCorners } from './site-frame'

export interface PageShellProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  width?: 'none' | 'narrow' | 'medium' | 'wide' | 'full'
  frame?: 'none' | 'full' | 'horizontal'
  mainClassName?: string
}

export function PageShell({
  header,
  footer,
  children,
  width = 'wide',
  frame = 'none',
  mainClassName,
}: PageShellProps) {
  useLayoutEffect(() => {
    document.documentElement.classList.add('scrollbar-gutter-stable')
    return () => document.documentElement.classList.remove('scrollbar-gutter-stable')
  }, [])

  const containerClass =
    width === 'none'
      ? undefined
      : {
          narrow: 'container-max-w-4xl',
          medium: 'container-max-w-5xl',
          wide: 'container-max-w-6xl',
          full: 'container-full-width',
        }[width]

  return (
    <div className={cn('bg-background flex min-h-svh flex-col')}>
      {frame !== 'none' && (
        <>
          <SiteFrame hideSides={frame === 'horizontal'} />
          {frame === 'full' && <SiteFrameCorners />}
        </>
      )}
      {header}

      <main
        className={cn(
          'flex-1',
          frame !== 'none' && 'md:pt-2.5 md:pb-2.5',
          containerClass,
          mainClassName,
        )}
      >
        {children}
      </main>

      {footer}
    </div>
  )
}
