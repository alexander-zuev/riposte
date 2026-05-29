import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@web/ui/components/ui/button'
import { toPng } from 'html-to-image'
import { type ReactNode, useCallback, useRef, useState } from 'react'

import { OG_HEIGHT, OG_WIDTH } from './og-frame'

/**
 * Wraps an OG card with a one-click PNG export. Captures the `[data-og-card]`
 * node at exactly 1200x630 (`pixelRatio: 1`), so the download is the precise
 * size `public/og-image.png` needs. Storybook-only — never shipped to the app.
 */
export function OgStage({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const download = useCallback(async () => {
    const node = ref.current?.querySelector<HTMLElement>('[data-og-card]')
    if (!node) return
    setBusy(true)
    try {
      // Fonts must be loaded or the wordmark/body render with fallbacks.
      await document.fonts.ready
      const dataUrl = await toPng(node, {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${name}.png`
      link.click()
    } finally {
      setBusy(false)
    }
  }, [name])

  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={download} disabled={busy}>
          <DownloadSimpleIcon size={18} />
          {busy ? 'Rendering' : 'Download PNG (1200×630)'}
        </Button>
        <small className="text-muted-foreground">{name}.png</small>
      </div>
      <div ref={ref} className="w-fit">
        {children}
      </div>
    </div>
  )
}
