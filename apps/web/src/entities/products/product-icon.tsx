import { PackageIcon } from '@phosphor-icons/react'
import { useState } from 'react'

function getFaviconUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname
    const upstream = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    return `/api/cache/images?url=${encodeURIComponent(upstream)}`
  } catch {
    return null
  }
}

export function ProductIcon({ url, className }: { url: string; className?: string }) {
  const [errored, setErrored] = useState(false)
  const src = errored ? null : getFaviconUrl(url)

  if (!src) {
    return <PackageIcon weight="duotone" className={className} />
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  )
}
