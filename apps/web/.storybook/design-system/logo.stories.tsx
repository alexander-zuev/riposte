import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo, LogoIcon } from '@web/ui/components/ui/logo'

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
    </div>
  ),
}
