"use client"

import { useScroll, useTransform, motion, type MotionValue } from "framer-motion"
import { useRef } from "react"

interface ParallaxLayerProps {
  children: React.ReactNode
  speed?: number
  offset?: number
  className?: string
  direction?: "vertical" | "horizontal"
}

export function ParallaxLayer({
  children,
  speed = 0.5,
  offset = 0,
  className,
  direction = "vertical",
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "vertical"
      ? [offset - speed * 100, offset + speed * 100]
      : [offset - speed * 50, offset + speed * 50]
  )

  return (
    <motion.div
      ref={ref}
      className={className}
      style={
        direction === "vertical" ? { y: transform } : { x: transform }
      }
    >
      {children}
    </motion.div>
  )
}

export function ParallaxBg({
  className,
  opacity = 0.4,
}: {
  className?: string
  opacity?: number
}) {
  const { scrollYProgress } = useScroll()
  const bgY: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [0, -150])
  const midY: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [0, -80])
  const fgY: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [0, -30])

  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className ?? ""}`} style={{ opacity }}>
      {/* Layer 1 — deep background, moves slowest */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <div className="bg-void absolute inset-0" />
        <div
          className="absolute left-1/4 top-[10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[150px]"
        />
        <div
          className="absolute right-1/4 bottom-[20%] h-[400px] w-[400px] rounded-full bg-info/5 blur-[120px]"
        />
        <div
          className="absolute left-[60%] top-[40%] h-[300px] w-[300px] rounded-full bg-error/5 blur-[100px]"
        />
      </motion.div>

      {/* Layer 2 — midground, medium speed */}
      <motion.div className="absolute inset-0" style={{ y: midY }}>
        <div
          className="absolute left-[10%] top-[30%] h-[200px] w-[200px] rounded-full bg-accent/3 blur-[80px]"
        />
        <div
          className="absolute right-[15%] top-[60%] h-[250px] w-[250px] rounded-full bg-info/3 blur-[90px]"
        />
      </motion.div>

      {/* Layer 3 — foreground grid + glow, moves with scroll */}
      <motion.div className="absolute inset-0" style={{ y: fgY }}>
        <div className="bg-grid-pattern bg-grid absolute inset-0 opacity-30" />
        <div
          className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/[0.04] blur-[120px]"
        />
        <div
          className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-info/[0.03] blur-[100px]"
        />
      </motion.div>
    </div>
  )
}
