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
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

const GAP_CLASS: Record<LogoSize, string> = {
  xs: 'gap-1.5',
  sm: 'gap-2',
  md: 'gap-2.5',
  lg: 'gap-3',
}

type LogoIconVariant = 'default' | 'dark' | 'app'

const SHARDS = (
  <>
    <polygon points="3,0 21,0 30,9 21,18" />
    <polygon points="3,14 15,14 15,28 3,16" />
    <polygon points="30,28 21,28 21,19" />
  </>
)

function LogoIcon({
  size = 32,
  variant = 'default',
  className,
}: {
  size?: number
  variant?: LogoIconVariant
  className?: string
}) {
  if (variant === 'dark') {
    return (
      <svg
        viewBox="0 0 38 36"
        height={size}
        className={cn('shrink-0', className)}
        aria-hidden="true"
      >
        <rect x={0} y={0} width={38} height={36} fill="var(--gray-12, #1c1917)" />
        <g transform="translate(4, 4)" fill="white">
          {SHARDS}
        </g>
      </svg>
    )
  }

  if (variant === 'app') {
    return (
      <svg
        viewBox="0 0 38 36"
        height={size}
        className={cn('shrink-0', className)}
        aria-hidden="true"
      >
        <rect x={0} y={0} width={38} height={36} fill="var(--accent, #84cc16)" />
        <g transform="translate(4, 4)" fill="var(--gray-12, #1c1917)">
          {SHARDS}
        </g>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 30 28"
      height={size}
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {SHARDS}
    </svg>
  )
}

function Logo({ variant = 'full', size = 'md', href, className }: LogoProps) {
  const content = (
    <>
      {variant !== 'wordmark' && <LogoIcon size={ICON_HEIGHT[size]} />}
      {variant !== 'icon' && (
        <span className={cn('font-brand font-bold tracking-[0.08em]', WORDMARK_CLASS[size])}>
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
export type { LogoProps, LogoIconVariant }
