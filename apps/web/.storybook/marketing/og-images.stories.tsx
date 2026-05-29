import type { Meta, StoryObj } from '@storybook/tanstack-react'

import { OG_OPTIONS } from './og/og-cards'
import { OG_HEIGHT, OG_WIDTH } from './og/og-frame'
import { OgStage } from './og/og-stage'

/**
 * Ten 1200x630 Open Graph card directions for `riposte.sh`. Pick one and it
 * becomes `public/og-image.png` (exported via the capture rig, added next).
 *
 * Each `Option NN` story renders a single card at exact pixel size and tags it
 * `[data-og-card]` so the exporter can screenshot it. `All Options` is a scaled
 * contact sheet for quick comparison only — do not capture from it.
 */
const meta: Meta = {
  title: 'Marketing/OG Images',
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj

function story(index: number): Story {
  const option = OG_OPTIONS[index]
  return {
    name: option.name,
    render: () => (
      <OgStage name={`og-${option.slug}`}>
        <option.Component />
      </OgStage>
    ),
  }
}

export const Option01: Story = story(0)
export const Option02: Story = story(1)
export const Option03: Story = story(2)
export const Option04: Story = story(3)
export const Option05: Story = story(4)
export const Option06: Story = story(5)
export const Option07: Story = story(6)
export const Option08: Story = story(7)
export const Option09: Story = story(8)
export const Option10: Story = story(9)

const THUMB_SCALE = 0.4

export const AllOptions: Story = {
  name: 'All Options',
  render: () => (
    <div className="grid grid-cols-2 gap-8 bg-surface p-8">
      {OG_OPTIONS.map((option) => (
        <div key={option.slug} className="flex flex-col gap-2">
          <div
            className="overflow-hidden rounded-lg border border-border"
            style={{ width: OG_WIDTH * THUMB_SCALE, height: OG_HEIGHT * THUMB_SCALE }}
          >
            <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left' }}>
              <option.Component />
            </div>
          </div>
          <small className="text-muted-foreground">
            {option.name} — {option.description}
          </small>
        </div>
      ))}
    </div>
  ),
}
