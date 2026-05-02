import { cn } from '@web/lib/utils'

interface SectionProps {
  id?: string
  className?: string
  children: React.ReactNode
  noPadding?: boolean
  rounded?: boolean
  background?: 'dark' | 'panel' | 'black'
}

const bgClasses = {
  dark: 'bg-background',
  panel: 'bg-surface',
  black: 'bg-background',
}

const Section = ({
  id,
  className,
  children,
  noPadding = false,
  rounded = false,
  background = 'dark',
}: SectionProps) => {
  return (
    <section
      id={id}
      className={cn(
        'relative overflow-clip',
        rounded && 'rounded-4xl md:mx-2.5',
        !noPadding && 'py-24 md:py-32',
        bgClasses[background],
        className,
      )}
    >
      {children}
    </section>
  )
}

export default Section
