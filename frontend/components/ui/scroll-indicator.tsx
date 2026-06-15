"use client"
import React, { useState, useEffect } from "react"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import { usePathname } from "next/navigation"

export function ScrollIndicator() {
  const pathname = usePathname()
  const { scrollYProgress } = useScroll()
  const scaleY = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
  const scrollPercentage = useTransform(scrollYProgress, (v) => Math.round(v * 100) + "%")
  const [hasScroll, setHasScroll] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      // Small buffer to prevent flashing scrollbars on edge cases
      setHasScroll(document.documentElement.scrollHeight > window.innerHeight + 50)
    }
    
    // Check initially and on short delay for dynamic hydration
    checkScroll()
    setTimeout(checkScroll, 500)
    
    window.addEventListener("resize", checkScroll)
    
    // Mutation observer triggers when page structure updates (e.g. expanding accordions)
    const observer = new MutationObserver(checkScroll)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    
    return () => {
      window.removeEventListener("resize", checkScroll)
      observer.disconnect()
    }
  }, [pathname]) // Re-run effect when route changes entirely

  if (!hasScroll) return null

  return (
    <div className="fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-4 sm:flex md:right-8 pointer-events-none">
      <motion.span className="text-accent writing-vertical-rl rotate-270 font-mono text-xs font-bold leading-none tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        {scrollPercentage}
      </motion.span>
      <div className="relative h-48 w-[2px] overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="bg-accent absolute right-0 top-0 w-full origin-top"
          style={{ scaleY, height: "100%" }}
        />
      </div>
    </div>
  )
}
