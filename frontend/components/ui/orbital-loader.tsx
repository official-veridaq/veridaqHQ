"use client"

/**
 * Spinner — replaces the orbital loader with a clean, professional
 * single-ring spinner. No pulsing cores, no multiple rings.
 */
import { Loader2 } from "lucide-react"

export function OrbitalLoader({ label, size = 120 }: { label?: string; size?: number }) {
  // Map the old size prop to a sensible icon size
  const iconSize = Math.round(size * 0.28)
  return (
    <div className="flex flex-col items-center gap-3" style={{ minHeight: size }}>
      <Loader2
        size={iconSize}
        className="text-accent animate-spin"
        strokeWidth={1.5}
      />
      {label && (
        <span className="text-muted font-mono text-xs uppercase tracking-widest">{label}</span>
      )}
    </div>
  )
}