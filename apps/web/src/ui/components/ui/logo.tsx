import { cn } from '@web/lib/utils'

type LogoVariant = 'icon' | 'wordmark' | 'full'
type LogoSize = 'xs' | 'sm' | 'md' | 'lg'

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  href?: string
  className?: string
}

const ICON_HEIGHT: Record<LogoSize, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
}

const WORDMARK_CLASS: Record<LogoSize, string> = {
  xs: 'text-[11px]',
  sm: 'text-[13px]',
  md: 'text-[17px]',
  lg: 'text-[22px]',
}

const GAP_CLASS: Record<LogoSize, string> = {
  xs: 'gap-1.5',
  sm: 'gap-2',
  md: 'gap-2.5',
  lg: 'gap-3',
}

function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 28"
      height={size}
      fill="none"
      stroke="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <path
        d="M10 5L4 11L10 17M4 11H24L29.5 16.5L24 22H18"
        strokeWidth="2.8"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

function Logo({ variant = 'full', size = 'md', href, className }: LogoProps) {
  const content = (
    <>
      {variant !== 'wordmark' && <LogoIcon size={ICON_HEIGHT[size]} />}
      {variant !== 'icon' && (
        <span
          className={cn('font-brand font-bold uppercase tracking-[0.18em]', WORDMARK_CLASS[size])}
        >
          Riposte
        </span>
      )}
    </>
  )

  const wrapperClass = cn(
    'inline-flex items-center shrink-0',
    variant === 'full' && GAP_CLASS[size],
    className,
  )

  if (href) {
    return (
      <a
        href={href}
        className={cn(wrapperClass, 'no-underline transition-opacity hover:opacity-80')}
      >
        {content}
      </a>
    )
  }

  return <span className={wrapperClass}>{content}</span>
}

export { Logo, LogoIcon }
export type { LogoProps }
