import { cn } from '@web/lib/utils'

interface CenteredPageProps {
  children: React.ReactNode
  className?: string
}

export function CenteredPage({ children, className }: CenteredPageProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center',
        className,
      )}
    >
      {children}
    </div>
  )
}
