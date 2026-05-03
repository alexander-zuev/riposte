import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'

import { Act1Dispute } from './act-1-dispute'
import { Act2Investigation } from './act-2-investigation'
import { Act3Evidence } from './act-3-evidence'
import { Act4Submission } from './act-4-submission'
import { Act5Win } from './act-5-win'

const RUNWAY_HEIGHT = '500vh'

function ActLayer({
  children,
  progress,
  range,
}: {
  children: React.ReactNode
  progress: ReturnType<typeof useScroll>['scrollYProgress']
  range: [number, number]
}) {
  const opacity = useTransform(
    progress,
    [range[0], range[0] + 0.02, range[1] - 0.02, range[1]],
    [0, 1, 1, 0],
  )

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      {children}
    </motion.div>
  )
}

export function ScrollStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <div ref={containerRef} style={{ height: RUNWAY_HEIGHT }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden bg-[var(--gray-2)]">
        <div className="relative h-full w-full">
          <ActLayer progress={scrollYProgress} range={[0, 0.22]}>
            <Act1Dispute progress={scrollYProgress} />
          </ActLayer>

          <ActLayer progress={scrollYProgress} range={[0.18, 0.47]}>
            <Act2Investigation progress={scrollYProgress} />
          </ActLayer>

          <ActLayer progress={scrollYProgress} range={[0.43, 0.67]}>
            <Act3Evidence progress={scrollYProgress} />
          </ActLayer>

          <ActLayer progress={scrollYProgress} range={[0.63, 0.82]}>
            <Act4Submission progress={scrollYProgress} />
          </ActLayer>

          <ActLayer progress={scrollYProgress} range={[0.78, 1.0]}>
            <Act5Win progress={scrollYProgress} />
          </ActLayer>
        </div>
      </div>
    </div>
  )
}
