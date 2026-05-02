export function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </span>
  )
}
