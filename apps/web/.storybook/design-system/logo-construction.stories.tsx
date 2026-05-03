import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta = {
  title: 'Design System/Logo Construction',
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj

export const Grid: Story = {
  name: '1. Grid',
  render: () => (
    <div className="p-8">
      <svg viewBox="0 0 30 30" width={400} height={400}>
        {/* Grid lines */}
        {Array.from({ length: 31 }, (_, i) => (
          <g key={i}>
            <line
              x1={i}
              y1={0}
              x2={i}
              y2={30}
              stroke={i % 3 === 0 ? '#ccc' : '#eee'}
              strokeWidth={i % 3 === 0 ? 0.06 : 0.03}
            />
            <line
              x1={0}
              y1={i}
              x2={30}
              y2={i}
              stroke={i % 3 === 0 ? '#ccc' : '#eee'}
              strokeWidth={i % 3 === 0 ? 0.06 : 0.03}
            />
          </g>
        ))}

        {/* Coordinate labels — every 3rd line (matching old 10-grid) */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`label-${i}`}>
            <text x={i * 3} y={-0.5} textAnchor="middle" fontSize={0.9} fill="#999">
              {i * 3}
            </text>
            <text x={-0.8} y={i * 3 + 0.3} textAnchor="middle" fontSize={0.9} fill="#999">
              {i * 3}
            </text>
          </g>
        ))}
      </svg>
    </div>
  ),
}

export const Construction: Story = {
  name: '2. Construction',
  render: () => (
    <div className="p-8">
      <svg viewBox="-5 -5 40 40" width={700} height={700}>
        {/* Grid lines — every 3rd line darker */}
        {Array.from({ length: 31 }, (_, i) => (
          <g key={i}>
            <line
              x1={i}
              y1={0}
              x2={i}
              y2={30}
              stroke={i % 3 === 0 ? '#ccc' : '#eee'}
              strokeWidth={i % 3 === 0 ? 0.06 : 0.03}
            />
            <line
              x1={0}
              y1={i}
              x2={30}
              y2={i}
              stroke={i % 3 === 0 ? '#ccc' : '#eee'}
              strokeWidth={i % 3 === 0 ? 0.06 : 0.03}
            />
          </g>
        ))}

        {/* Grid coordinate labels — every 3rd line */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`label-${i}`}>
            <text
              x={i * 3}
              y={-1.5}
              textAnchor="middle"
              fontSize={1.2}
              fill="#666"
              fontWeight="bold"
            >
              {i * 3}
            </text>
            <text
              x={-2.5}
              y={i * 3 + 0.4}
              textAnchor="middle"
              fontSize={1.2}
              fill="#666"
              fontWeight="bold"
            >
              {i * 3}
            </text>
          </g>
        ))}

        {/* A. TOP SHARD */}
        <polygon points="3,0 21,0 30,9 21,18" fill="currentColor" />

        {/* B. LEFT SHARD — 45° diagonal, 1-unit gap with A */}
        <polygon points="3,14 15,14 15,28 3,16" fill="currentColor" />

        {/* C. LOWER RIGHT SHARD — 9×9 legs = 45°, 1-unit gap with A */}
        <polygon points="30,28 21,28 21,19" fill="currentColor" />
      </svg>
    </div>
  ),
}
