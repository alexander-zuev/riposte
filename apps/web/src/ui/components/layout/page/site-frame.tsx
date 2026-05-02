import { cn } from '@web/lib/utils'

export function ConcaveCorner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none', className)}
      width="50"
      height="50"
      viewBox="0 0 50 50"
      fill="none"
      aria-hidden="true"
    >
      <path d="M 0 0 C 0 37.3 9 50 50 50 H 0 V 0 Z" fill="currentColor" />
    </svg>
  )
}

export function SiteFrame({ hideSides = false }: { hideSides?: boolean }) {
  return (
    <div aria-hidden="true" className="hidden md:block">
      <div className="fixed inset-x-0 top-0 z-40 h-2.5 bg-background" />
      <div className="fixed inset-x-0 bottom-0 z-40 h-2.5 bg-background" />
      {!hideSides && (
        <>
          <div className="fixed inset-y-0 left-0 z-40 w-2.5 bg-background" />
          <div className="fixed inset-y-0 right-0 z-40 w-2.5 bg-background" />
        </>
      )}
    </div>
  )
}

export function SiteFrameCorners() {
  return (
    <div aria-hidden="true" className="hidden md:block">
      <ConcaveCorner className="fixed top-2.5 left-2.5 z-40 rotate-90 text-background" />
      <ConcaveCorner className="fixed top-2.5 right-2.5 z-40 rotate-180 text-background" />
      <ConcaveCorner className="fixed right-2.5 bottom-2.5 z-40 rotate-270 text-background" />
      <ConcaveCorner className="fixed bottom-2.5 left-2.5 z-40 text-background" />
    </div>
  )
}
