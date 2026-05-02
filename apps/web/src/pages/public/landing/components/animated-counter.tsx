import { useInView, useMotionValue, useTransform, motion, animate } from 'motion/react'
import { useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className,
  duration = 1.5,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v))

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, { duration, ease: 'easeOut' })
    }
  }, [isInView, motionValue, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
