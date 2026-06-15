"use client"

import { motion, type Variants } from "framer-motion"

type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "zoom-in" | "none"

interface ScrollRevealProps {
  children: React.ReactNode
  direction?: RevealDirection
  distance?: number
  delay?: number
  duration?: number
  once?: boolean
  className?: string
  amount?: "some" | "all" | number
}

const variantMap: Record<RevealDirection, Variants> = {
  up: {
    hidden: { opacity: 0, y: 30 },
    visible: (d: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  down: {
    hidden: { opacity: 0, y: -30 },
    visible: (d: number) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  left: {
    hidden: { opacity: 0, x: -40 },
    visible: (d: number) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  right: {
    hidden: { opacity: 0, x: 40 },
    visible: (d: number) => ({ opacity: 1, x: 0, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: (d: number) => ({ opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  "zoom-in": {
    hidden: { opacity: 0, scale: 0.8, filter: "blur(4px)" },
    visible: (d: number) => ({ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] } }),
  },
  none: {
    hidden: { opacity: 0 },
    visible: (d: number) => ({ opacity: 1, transition: { duration: 0.5, delay: d } }),
  },
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  once = false,
  className,
  amount = 0.08,
}: ScrollRevealProps) {
  const variants = variantMap[direction]

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}
