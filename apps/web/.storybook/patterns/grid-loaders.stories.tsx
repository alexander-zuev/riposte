import type { Meta, StoryObj } from '@storybook/tanstack-react'

function GridLoaderShowcase() {
  return (
    <div className="grid grid-cols-3 gap-12 p-12">
      <LoaderCell name="Diagonal Wave" description="3x3, scale pulse with diagonal stagger">
        <DiagonalWave />
      </LoaderCell>
      <LoaderCell name="Fade Chase" description="3x3, opacity chases around the perimeter">
        <FadeChase />
      </LoaderCell>
      <LoaderCell name="Column Rise" description="3x3, columns rise and fall sequentially">
        <ColumnRise />
      </LoaderCell>
      <LoaderCell name="Ripple Fill" description="3x3, fills from center outward">
        <RippleFill />
      </LoaderCell>
      <LoaderCell name="Checkerboard" description="3x3, alternating cells blink">
        <Checkerboard />
      </LoaderCell>
      <LoaderCell name="Snake" description="3x3, single pixel snakes through all cells">
        <Snake />
      </LoaderCell>
      <LoaderCell name="Breathe" description="2x2, all cells scale in unison with offset">
        <Breathe />
      </LoaderCell>
      <LoaderCell name="Rain" description="3x3, drops fall down each column">
        <Rain />
      </LoaderCell>
      <LoaderCell name="Heartbeat" description="3x3, center pulses then radiates outward">
        <Heartbeat />
      </LoaderCell>
    </div>
  )
}

function LoaderCell({
  name,
  description,
  children,
}: {
  name: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded border border-border p-8">
      <div className="flex h-12 items-center justify-center">{children}</div>
      <div className="text-center">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Diagonal Wave — scale pulse with diagonal delay                 */
/* ------------------------------------------------------------------ */
function DiagonalWave() {
  const delays = [0, 1, 2, 1, 2, 3, 2, 3, 4]
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {delays.map((d, i) => (
        <span
          key={i}
          className="size-2 rounded-[1px] bg-foreground"
          style={{
            animation: 'grid-pulse 1.2s ease-in-out infinite',
            animationDelay: `${d * 100}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes grid-pulse {
          0%, 100% { transform: scale(0.7); opacity: 0.3; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Fade Chase — opacity travels around the perimeter               */
/* ------------------------------------------------------------------ */
function FadeChase() {
  // perimeter order: top-left → top-right → right-down → bottom-left → left-up, center last
  const order = [0, 1, 2, 5, 8, 7, 6, 3, 4]
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const perimIdx = order.indexOf(i)
        return (
          <span
            key={i}
            className="size-2 rounded-[1px] bg-foreground"
            style={{
              animation: 'grid-fade-chase 1.4s linear infinite',
              animationDelay: `${perimIdx * 155}ms`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes grid-fade-chase {
          0%, 100% { opacity: 0.15; }
          12% { opacity: 1; }
          40% { opacity: 0.15; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Column Rise — columns translate up then back                    */
/* ------------------------------------------------------------------ */
function ColumnRise() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const col = i % 3
        return (
          <span
            key={i}
            className="size-2 rounded-[1px] bg-foreground"
            style={{
              animation: 'grid-rise 0.9s ease-in-out infinite',
              animationDelay: `${col * 150}ms`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes grid-rise {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Ripple Fill — center fills first, then edges, then corners      */
/* ------------------------------------------------------------------ */
function RippleFill() {
  // distance from center: center=0, edges=1, corners=2
  const rings = [2, 1, 2, 1, 0, 1, 2, 1, 2]
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {rings.map((ring, i) => (
        <span
          key={i}
          className="size-2 rounded-[1px] bg-foreground"
          style={{
            animation: 'grid-ripple 1.2s ease-out infinite',
            animationDelay: `${ring * 200}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes grid-ripple {
          0% { transform: scale(0.5); opacity: 0; }
          30% { transform: scale(1.1); opacity: 1; }
          60%, 100% { transform: scale(0.7); opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Checkerboard — alternating cells blink in antiphase             */
/* ------------------------------------------------------------------ */
function Checkerboard() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const isEven = (row + col) % 2 === 0
        return (
          <span
            key={i}
            className="size-2 rounded-[1px] bg-foreground"
            style={{
              animation: 'grid-checker 1s ease-in-out infinite',
              animationDelay: isEven ? '0ms' : '500ms',
            }}
          />
        )
      })}
      <style>{`
        @keyframes grid-checker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Snake — single lit cell snakes through all 9 positions          */
/* ------------------------------------------------------------------ */
function Snake() {
  // snake path: row0 L→R, row1 R→L, row2 L→R
  const path = [0, 1, 2, 5, 4, 3, 6, 7, 8]
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const step = path.indexOf(i)
        return (
          <span
            key={i}
            className="size-2 rounded-[1px] bg-foreground"
            style={{
              animation: 'grid-snake 1.8s linear infinite',
              animationDelay: `${step * 200}ms`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes grid-snake {
          0%, 100% { opacity: 0.1; }
          5% { opacity: 1; }
          16% { opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 7. Breathe — 2x2 grid, cells scale with rotational offset         */
/* ------------------------------------------------------------------ */
function Breathe() {
  return (
    <div className="grid grid-cols-2 gap-1">
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className="size-2.5 rounded-[1px] bg-foreground"
          style={{
            animation: 'grid-breathe 1.6s ease-in-out infinite',
            animationDelay: `${i * 400}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes grid-breathe {
          0%, 100% { transform: scale(0.6); opacity: 0.3; }
          50% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 8. Rain — drops fall down each column independently                */
/* ------------------------------------------------------------------ */
function Rain() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        return (
          <span
            key={i}
            className="size-2 rounded-[1px] bg-foreground"
            style={{
              animation: 'grid-rain 1.2s ease-in infinite',
              animationDelay: `${col * 300 + row * 150}ms`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes grid-rain {
          0%, 100% { opacity: 0.1; }
          20% { opacity: 1; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 9. Heartbeat — center pulses, then radiates to edges and corners   */
/* ------------------------------------------------------------------ */
function Heartbeat() {
  const rings = [2, 1, 2, 1, 0, 1, 2, 1, 2]
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {rings.map((ring, i) => (
        <span
          key={i}
          className="size-2 rounded-[1px] bg-foreground"
          style={{
            animation: 'grid-heartbeat 1.4s ease-out infinite',
            animationDelay: `${ring * 150}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes grid-heartbeat {
          0%, 100% { transform: scale(0.7); opacity: 0.2; }
          15% { transform: scale(1.2); opacity: 1; }
          30% { transform: scale(0.85); opacity: 0.6; }
          45% { transform: scale(1.05); opacity: 0.9; }
          60% { transform: scale(0.7); opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const meta = {
  title: 'Patterns/Loading States/Grid Loaders',
  component: GridLoaderShowcase,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof GridLoaderShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const AllVariants: Story = {}
