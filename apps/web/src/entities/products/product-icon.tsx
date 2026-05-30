import { PackageIcon } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import { useState } from 'react'

function getFaviconUrls(url: string): string[] {
  try {
    const hostname = new URL(url).hostname
    const candidates = [hostname, getParentHostname(hostname)].filter(
      (candidate): candidate is string => Boolean(candidate),
    )

    return Array.from(new Set(candidates)).map((candidate) => {
      const upstream = `https://www.google.com/s2/favicons?domain=${candidate}&sz=64`
      return `/api/cache/images?url=${encodeURIComponent(upstream)}`
    })
  } catch {
    return []
  }
}

function getParentHostname(hostname: string): string | null {
  const parts = hostname.split('.').filter(Boolean)
  if (parts.length <= 2) return null
  return parts.slice(-2).join('.')
}

export function FaviconIcon({
  url,
  className,
  fallback: Fallback,
}: {
  url: string
  className?: string
  fallback: ComponentType<{ className?: string }>
}) {
  const [failedCount, setFailedCount] = useState(0)
  const src = getFaviconUrls(url)[failedCount] ?? null

  if (!src) {
    return <Fallback className={className} />
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailedCount((count) => count + 1)}
    />
  )
}

export function ProductIcon({ url, className }: { url: string; className?: string }) {
  return <FaviconIcon url={url} className={className} fallback={ProductIconFallback} />
}

function ProductIconFallback({ className }: { className?: string }) {
  return <PackageIcon weight="duotone" className={className} />
}
