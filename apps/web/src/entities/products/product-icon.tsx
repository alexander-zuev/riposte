import { PackageIcon } from '@phosphor-icons/react'
import { useState } from 'react'

function getFaviconUrl(url: string): string | null {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
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

  return <img src={src} alt="" className={className} onError={() => setErrored(true)} />
}
