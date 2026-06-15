"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface LogoMarkProps {
  className?: string
  /** Force a specific variant regardless of theme */
  variant?: "dark" | "light"
}

/**
 * Theme-aware logo component.
 * Dark mode: white logo (logo-white.png)
 * Light mode: black logo (logo-black.png)
 */
export function LogoMark({ className = "h-8 w-8", variant }: LogoMarkProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // During SSR / hydration, default to dark (white logo) to avoid flash
  const isDark = variant === "dark" || (!variant && (mounted ? resolvedTheme !== "light" : true))

  return (
    <img
      src={isDark ? "/logo-white.png" : "/logo-black.png"}
      alt="VERIDAQ"
      className={className}
      draggable={false}
    />
  )
}
