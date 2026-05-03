export function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-system text-xs font-medium text-accent uppercase">
      {children}
    </span>
  )
}
