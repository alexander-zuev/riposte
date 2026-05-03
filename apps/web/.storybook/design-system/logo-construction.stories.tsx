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
      <svg viewBox="0 0 10 10" width={400} height={400}>
        {/* Grid lines */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <line x1={i} y1={0} x2={i} y2={10} stroke="#ddd" strokeWidth={0.02} />
            <line x1={0} y1={i} x2={10} y2={i} stroke="#ddd" strokeWidth={0.02} />
          </g>
        ))}

        {/* Coordinate labels */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`label-${i}`}>
            <text x={i} y={-0.15} textAnchor="middle" fontSize={0.3} fill="#999">
              {i}
            </text>
            <text x={-0.25} y={i + 0.1} textAnchor="middle" fontSize={0.3} fill="#999">
              {i}
            </text>
          </g>
        ))}

        {/* Grid dots at intersections */}
        {Array.from({ length: 11 }, (_, x) =>
          Array.from({ length: 11 }, (_, y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={0.06} fill="#ccc" />
          )),
        )}

        {/* Diagonal guides (45°) */}
        <line x1={0} y1={0} x2={10} y2={10} stroke="#eee" strokeWidth={0.01} strokeDasharray="0.1 0.1" />
        <line x1={10} y1={0} x2={0} y2={10} stroke="#eee" strokeWidth={0.01} strokeDasharray="0.1 0.1" />
      </svg>
    </div>
  ),
}

export const TopShard: Story = {
  name: '2. Top Shard (A)',
  render: () => (
    <div className="p-8">
      <svg viewBox="-3 -3 16 16" width={700} height={700}>
        {/* Grid lines */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <line x1={i} y1={0} x2={i} y2={10} stroke="#ddd" strokeWidth={0.03} />
            <line x1={0} y1={i} x2={10} y2={i} stroke="#ddd" strokeWidth={0.03} />
          </g>
        ))}

        {/* Grid coordinate labels — top (X) */}
        {Array.from({ length: 11 }, (_, i) => (
          <text key={`x-${i}`} x={i} y={-1.2} textAnchor="middle" fontSize={0.6} fill="#666" fontWeight="bold">
            {i}
          </text>
        ))}

        {/* Grid coordinate labels — left (Y) */}
        {Array.from({ length: 11 }, (_, i) => (
          <text key={`y-${i}`} x={-1.5} y={i + 0.2} textAnchor="middle" fontSize={0.6} fill="#666" fontWeight="bold">
            {i}
          </text>
        ))}

        {/* Grid dots */}
        {Array.from({ length: 11 }, (_, x) =>
          Array.from({ length: 11 }, (_, y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={0.08} fill="#bbb" />
          )),
        )}

        {/* A. TOP SHARD — all edges 45° or 90°, grid-snapped */}
        <polygon points="1,0 7,0 10,3 7,6" fill="black" fillOpacity={0.85} />

        {/* Edge labels */}
        <text x={3} y={5} textAnchor="end" fontSize={0.5} fill="#e11d48" fontWeight="bold">E1 (45°)</text>
        <text x={9.5} y={6} textAnchor="start" fontSize={0.5} fill="#2563eb" fontWeight="bold">E2 (45°)</text>
        <text x={9.5} y={2} textAnchor="start" fontSize={0.5} fill="#16a34a" fontWeight="bold">E3 (45°)</text>
        <text x={4} y={0.5} textAnchor="middle" fontSize={0.5} fill="#ea580c" fontWeight="bold">E4 (horiz)</text>

        {/* Vertex dots + labels */}
        <circle cx={1} cy={0} r={0.25} fill="#e11d48" />
        <text x={-0.5} y={-0.5} fontSize={0.6} fill="#e11d48" fontWeight="bold">P1 (1,0)</text>

        <circle cx={7} cy={6} r={0.25} fill="#2563eb" />
        <text x={7.5} y={6.8} fontSize={0.6} fill="#2563eb" fontWeight="bold">P2 (7,6)</text>

        <circle cx={10} cy={3} r={0.25} fill="#16a34a" />
        <text x={10.5} y={2.5} fontSize={0.6} fill="#16a34a" fontWeight="bold">P3 (10,3)</text>

        <circle cx={7} cy={0} r={0.25} fill="#ea580c" />
        <text x={7.5} y={-0.5} fontSize={0.6} fill="#ea580c" fontWeight="bold">P4 (7,0)</text>

        {/* C. LOWER RIGHT SHARD */}
        <polygon points="10,10 7,10 7,6" fill="black" fillOpacity={0.85} />
      </svg>
    </div>
  ),
}
