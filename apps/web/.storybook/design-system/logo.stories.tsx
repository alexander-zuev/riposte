import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo, LogoIcon } from '@web/ui/components/ui/logo'
import { useCallback, useRef } from 'react'

function downloadSvg(el: SVGSVGElement, name: string) {
  const clone = el.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPng(el: SVGSVGElement, name: string, scale = 4) {
  const clone = el.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const rendered = el.getBoundingClientRect()
  const w = rendered.width
  const h = rendered.height
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  const img = new Image()
  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${name}.png`
    a.click()
  }
  img.src = url
}

function DownloadableIcon({ name, children }: { name: string; children: React.ReactElement }) {
  const ref = useRef<HTMLDivElement>(null)

  const onSvg = useCallback(() => {
    const svg = ref.current?.querySelector('svg')
    if (svg) downloadSvg(svg, name)
  }, [name])

  const onPng = useCallback(() => {
    const svg = ref.current?.querySelector('svg')
    if (svg) downloadPng(svg, name)
  }, [name])

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="rounded border border-border p-4">
        {children}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSvg}
          className="cursor-pointer rounded bg-muted px-2 py-1 text-xs hover:bg-muted-foreground/20"
        >
          SVG
        </button>
        <button
          type="button"
          onClick={onPng}
          className="cursor-pointer rounded bg-muted px-2 py-1 text-xs hover:bg-muted-foreground/20"
        >
          PNG @4x
        </button>
      </div>
      <code className="text-xs text-muted-foreground">{name}</code>
    </div>
  )
}

const meta: Meta = {
  title: 'Design System/Logo',
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj

export const AllVariants: Story = {
  name: 'Variants & Sizes',
  render: () => (
    <div className="space-y-10 p-8">
      <div className="space-y-6">
        <h6 className="text-muted-foreground">Full (default)</h6>
        <div className="flex flex-col gap-4">
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="flex items-center gap-4">
              <code className="w-8 text-xs text-muted-foreground">{size}</code>
              <Logo size={size} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">Icon only</h6>
        <div className="flex items-center gap-6">
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Logo variant="icon" size={size} />
              <code className="text-xs text-muted-foreground">{size}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">Wordmark only</h6>
        <div className="flex flex-col gap-3">
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="flex items-center gap-4">
              <code className="w-8 text-xs text-muted-foreground">{size}</code>
              <Logo variant="wordmark" size={size} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">As link</h6>
        <div className="flex items-center gap-6">
          <Logo href="/" size="md" />
          <Logo variant="icon" href="/" size="md" />
          <Logo variant="wordmark" href="/" size="md" />
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">On dark surface</h6>
        <div className="flex items-center gap-6 bg-foreground p-6">
          <Logo size="md" className="text-background" />
          <Logo variant="icon" size="lg" className="text-background" />
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">Icon standalone</h6>
        <div className="flex items-center gap-4">
          <LogoIcon size={16} />
          <LogoIcon size={24} />
          <LogoIcon size={32} />
          <LogoIcon size={48} />
          <LogoIcon size={64} />
        </div>
      </div>

      <div className="space-y-6">
        <h6 className="text-muted-foreground">App icon (lime pearlescent)</h6>
        <div className="flex items-center gap-4">
          <LogoIcon variant="app" size={24} />
          <LogoIcon variant="app" size={32} />
          <LogoIcon variant="app" size={48} />
          <LogoIcon variant="app" size={64} />
          <LogoIcon variant="app" size={96} />
        </div>
      </div>
    </div>
  ),
}

export const Download: Story = {
  name: 'Download Assets',
  render: () => (
    <div className="space-y-10 p-8">
      <h6 className="text-muted-foreground">Click SVG or PNG to download</h6>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Icon — dark on light</p>
        <div className="flex flex-wrap gap-6">
          <DownloadableIcon name="riposte-icon-64">
            <LogoIcon size={64} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-icon-128">
            <LogoIcon size={128} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-icon-256">
            <LogoIcon size={256} />
          </DownloadableIcon>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Icon — light on dark</p>
        <div className="flex flex-wrap gap-6">
          <DownloadableIcon name="riposte-icon-light-64">
            <LogoIcon variant="dark" size={64} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-icon-light-128">
            <LogoIcon variant="dark" size={128} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-icon-light-512">
            <LogoIcon variant="dark" size={512} />
          </DownloadableIcon>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">App icon — lime pearlescent</p>
        <div className="flex flex-wrap gap-6">
          <DownloadableIcon name="riposte-app-icon-64">
            <LogoIcon variant="app" size={64} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-app-icon-128">
            <LogoIcon variant="app" size={128} />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-app-icon-256">
            <LogoIcon variant="app" size={256} />
          </DownloadableIcon>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Full logo</p>
        <div className="flex flex-wrap gap-6">
          <DownloadableIcon name="riposte-logo-full">
            <Logo size="lg" />
          </DownloadableIcon>
          <DownloadableIcon name="riposte-logo-full-light">
            <div className="bg-foreground p-4">
              <Logo size="lg" className="text-background" />
            </div>
          </DownloadableIcon>
        </div>
      </div>
    </div>
  ),
}
